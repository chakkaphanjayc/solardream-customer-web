import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { proposalRevisions, proposals } from "@/db/schema";
import { requireStaffJson } from "@/lib/auth-guard";
import {
  executeQuotationCommand,
  QuotationCommandError,
} from "@/server/services/sales/quotation-command-service";

const sha256DocumentHash = z.string().regex(/^[0-9a-fA-F]{64}$/, "A SHA-256 document hash is required.");
const QuotationCommandSchema = z.discriminatedUnion("command", [
  z.object({
    command: z.literal("SEND_REVISION"),
    revisionId: z.string().uuid(),
    documentHash: sha256DocumentHash,
    pdfDocumentReference: z.string().trim().min(1).max(2048).optional(),
  }).strict(),
  z.object({
    command: z.literal("MARK_REVISION_VIEWED"),
    revisionId: z.string().uuid(),
  }).strict(),
  z.object({
    command: z.literal("SUPERSEDE_REVISION"),
    revisionId: z.string().uuid(),
  }).strict(),
  z.object({
    command: z.literal("VOID_REVISION"),
    revisionId: z.string().uuid(),
  }).strict(),
]);

function safeIsoDate(value: unknown): string {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function nullableIsoDate(value: unknown): string | null {
  return value ? safeIsoDate(value) : null;
}

function serializeQuotation(row: NonNullable<Awaited<ReturnType<typeof getQuotationRow>>>) {
  return {
    id: row.id,
    status: row.status,
    dispatchStatus: row.dispatchStatus,
    magicTokenSlug: row.magicTokenSlug,
    erpnextQuotationId: row.erpnextQuotationId,
    updatedAt: safeIsoDate(row.updatedAt),
    canonicalRevision: row.canonicalRevision
      ? {
          id: row.canonicalRevision.id,
          revisionNumber: row.canonicalRevision.revisionNumber,
          status: row.canonicalRevision.status,
          documentHash: row.canonicalRevision.documentHash,
          pdfDocumentReference: row.canonicalRevision.pdfDocumentReference,
          sentAt: nullableIsoDate(row.canonicalRevision.sentAt),
          viewedAt: nullableIsoDate(row.canonicalRevision.viewedAt),
          acceptedAt: nullableIsoDate(row.canonicalRevision.acceptedAt),
          createdAt: safeIsoDate(row.canonicalRevision.createdAt),
        }
      : null,
    documentRequests: row.documentRequests.map((request) => ({
      id: request.id,
      quotationId: request.quotationId,
      documentName: request.documentName,
      descriptionHint: request.descriptionHint,
      requestType: request.requestType,
      isRequired: request.isRequired,
      status: request.status,
      fileUrl: request.fileUrl,
      metadata: request.metadata,
      attachments: request.attachments.map((attachment) => ({
        id: attachment.id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        storageProvider: attachment.storageProvider,
        storageFileId: attachment.storageFileId,
        fallbackUrl: attachment.fallbackUrl,
        metadata: attachment.metadata,
        createdAt: safeIsoDate(attachment.createdAt),
        updatedAt: safeIsoDate(attachment.updatedAt),
      })),
      updatedAt: safeIsoDate(request.updatedAt),
    })),
  };
}

function isMissingAttachmentTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const cause = "cause" in error ? error.cause : null;
  return Boolean(
    cause &&
      typeof cause === "object" &&
      "code" in cause &&
      cause.code === "42P01" &&
      "message" in cause &&
      typeof cause.message === "string" &&
      cause.message.includes("quotation_document_request_attachments"),
  );
}

async function getQuotationRow(id: string) {
  const query = {
    where: eq(proposals.id, id),
    columns: {
      id: true,
      status: true,
      dispatchStatus: true,
      magicTokenSlug: true,
      erpnextQuotationId: true,
      updatedAt: true,
    },
  } as const;
  try {
    const quotation = await db.query.proposals.findFirst({
      ...query,
      with: {
        documentRequests: {
          with: { attachments: true },
        },
      },
    });
    if (!quotation) return undefined;
    const canonicalRevision = await db.query.proposalRevisions.findFirst({
      where: eq(proposalRevisions.proposalId, quotation.id),
      orderBy: [desc(proposalRevisions.revisionNumber)],
    });
    return { ...quotation, canonicalRevision };
  } catch (error) {
    if (!isMissingAttachmentTableError(error)) throw error;
    const legacyQuotation = await db.query.proposals.findFirst({
      ...query,
      with: { documentRequests: true },
    });
    if (!legacyQuotation) return undefined;
    const canonicalRevision = await db.query.proposalRevisions.findFirst({
      where: eq(proposalRevisions.proposalId, legacyQuotation.id),
      orderBy: [desc(proposalRevisions.revisionNumber)],
    });
    return {
      ...legacyQuotation,
      canonicalRevision,
      documentRequests: legacyQuotation.documentRequests.map((request) => ({
        ...request,
        attachments: [],
      })),
    };
  }
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireStaffJson();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const quotation = await getQuotationRow(id);

  if (!quotation) {
    return NextResponse.json({ error: "Quotation was not found." }, { status: 404 });
  }

  return NextResponse.json({ quotation: serializeQuotation(quotation) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireStaffJson();
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = QuotationCommandSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ||
          "A valid quotation command and canonical revision ID are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await executeQuotationCommand({
      proposalId: id,
      ...parsed.data,
    });

    const quotation = await getQuotationRow(result.proposal.id);

    if (!quotation) {
      return NextResponse.json(
        { error: "Quotation was not found after command execution." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, quotation: serializeQuotation(quotation) });
  } catch (error) {
    if (error instanceof QuotationCommandError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.httpStatus },
      );
    }
    console.error("[PATCH /api/quotations/:id] command failed", error);
    return NextResponse.json(
      { error: "Unable to execute the quotation command." },
      { status: 500 },
    );
  }
}
