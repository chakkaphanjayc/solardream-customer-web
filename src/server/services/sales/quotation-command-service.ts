import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { proposalRevisions, proposals } from "@/db/schema";
import {
  assertProposalRevisionTransition,
  projectLegacyProposalFromRevision,
  quotationRevisionLockKey,
} from "@/server/services/sales/domain/quotation-revision-state";

export type QuotationCommandInput =
  | {
      command: "SEND_REVISION";
      proposalId: string;
      revisionId: string;
      documentHash: string;
      pdfDocumentReference?: string;
    }
  | {
      command: "MARK_REVISION_VIEWED";
      proposalId: string;
      revisionId: string;
    }
  | {
      command: "SUPERSEDE_REVISION";
      proposalId: string;
      revisionId: string;
    }
  | {
      command: "VOID_REVISION";
      proposalId: string;
      revisionId: string;
    };

export class QuotationCommandError extends Error {
  constructor(
    readonly code:
      | "QUOTATION_NOT_FOUND"
      | "REVISION_NOT_FOUND"
      | "REVISION_NOT_CURRENT"
      | "INVALID_DOCUMENT_HASH"
      | "INVALID_TRANSITION"
      | "CONCURRENT_UPDATE",
    message: string,
    readonly httpStatus: 400 | 404 | 409,
  ) {
    super(message);
  }
}

function assertTransition(
  from: Parameters<typeof assertProposalRevisionTransition>[0],
  to: Parameters<typeof assertProposalRevisionTransition>[1],
): void {
  try {
    assertProposalRevisionTransition(from, to);
  } catch (error) {
    throw new QuotationCommandError(
      "INVALID_TRANSITION",
      error instanceof Error ? error.message : "Invalid quotation revision transition.",
      409,
    );
  }
}

function normalizeDocumentHash(value: string): string {
  const hash = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new QuotationCommandError(
      "INVALID_DOCUMENT_HASH",
      "A SHA-256 document hash is required before sending a quotation revision.",
      400,
    );
  }
  return hash;
}

async function findLatestRevision(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  proposalId: string,
) {
  return tx.query.proposalRevisions.findFirst({
    where: eq(proposalRevisions.proposalId, proposalId),
    orderBy: [desc(proposalRevisions.revisionNumber)],
  });
}

export async function executeQuotationCommand(input: QuotationCommandInput) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${quotationRevisionLockKey(input.proposalId)}))`,
    );

    const proposal = await tx.query.proposals.findFirst({
      where: eq(proposals.id, input.proposalId),
    });
    if (!proposal) {
      throw new QuotationCommandError(
        "QUOTATION_NOT_FOUND",
        "Quotation was not found.",
        404,
      );
    }

    const revision = await tx.query.proposalRevisions.findFirst({
      where: and(
        eq(proposalRevisions.id, input.revisionId),
        eq(proposalRevisions.proposalId, input.proposalId),
      ),
    });
    if (!revision) {
      throw new QuotationCommandError(
        "REVISION_NOT_FOUND",
        "The quotation revision was not found for this proposal.",
        404,
      );
    }

    const latest = await findLatestRevision(tx, input.proposalId);
    if (!latest) {
      throw new QuotationCommandError(
        "REVISION_NOT_FOUND",
        "The quotation has no canonical revision.",
        409,
      );
    }

    const now = new Date();
    let updatedRevision: typeof revision | undefined;

    switch (input.command) {
      case "SEND_REVISION": {
        if (latest.id !== revision.id) {
          throw new QuotationCommandError(
            "REVISION_NOT_CURRENT",
            "Only the current quotation revision can be sent.",
            409,
          );
        }
        assertTransition(revision.status, "SENT");
        const documentHash = normalizeDocumentHash(input.documentHash);
        [updatedRevision] = await tx
          .update(proposalRevisions)
          .set({
            status: "SENT",
            sentAt: now,
            documentHash,
            pdfDocumentReference:
              input.pdfDocumentReference ?? revision.pdfDocumentReference,
          })
          .where(
            and(
              eq(proposalRevisions.id, revision.id),
              eq(proposalRevisions.status, "DRAFT"),
            ),
          )
          .returning();
        break;
      }
      case "MARK_REVISION_VIEWED": {
        if (latest.id !== revision.id) {
          throw new QuotationCommandError(
            "REVISION_NOT_CURRENT",
            "Only the current quotation revision can be viewed.",
            409,
          );
        }
        assertTransition(revision.status, "VIEWED");
        [updatedRevision] = await tx
          .update(proposalRevisions)
          .set({ status: "VIEWED", viewedAt: revision.viewedAt ?? now })
          .where(
            and(
              eq(proposalRevisions.id, revision.id),
              inArray(proposalRevisions.status, ["SENT", "VIEWED"]),
            ),
          )
          .returning();
        break;
      }
      case "SUPERSEDE_REVISION": {
        assertTransition(revision.status, "SUPERSEDED");
        [updatedRevision] = await tx
          .update(proposalRevisions)
          .set({ status: "SUPERSEDED" })
          .where(
            and(
              eq(proposalRevisions.id, revision.id),
              inArray(proposalRevisions.status, ["SENT", "VIEWED"]),
            ),
          )
          .returning();
        break;
      }
      case "VOID_REVISION": {
        assertTransition(revision.status, "VOID");
        [updatedRevision] = await tx
          .update(proposalRevisions)
          .set({ status: "VOID" })
          .where(
            and(
              eq(proposalRevisions.id, revision.id),
              inArray(proposalRevisions.status, ["DRAFT", "SENT", "VIEWED"]),
            ),
          )
          .returning();
        break;
      }
    }

    if (!updatedRevision) {
      throw new QuotationCommandError(
        "CONCURRENT_UPDATE",
        "The quotation revision changed before this command completed. Reload and try again.",
        409,
      );
    }

    const latestAfterCommand = await findLatestRevision(tx, input.proposalId);
    if (!latestAfterCommand) {
      throw new QuotationCommandError(
        "REVISION_NOT_FOUND",
        "The quotation has no canonical revision after the command.",
        409,
      );
    }

    const legacyProjection = projectLegacyProposalFromRevision(
      latestAfterCommand.status,
    );
    const [projectedProposal] = await tx
      .update(proposals)
      .set({ ...legacyProjection, updatedAt: now })
      .where(eq(proposals.id, proposal.id))
      .returning();
    if (!projectedProposal) {
      throw new QuotationCommandError(
        "QUOTATION_NOT_FOUND",
        "Quotation was not found while projecting its canonical revision state.",
        404,
      );
    }

    return {
      proposal: projectedProposal,
      revision: updatedRevision,
      currentRevision: latestAfterCommand,
    };
  });
}
