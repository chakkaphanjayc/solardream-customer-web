import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { proposalRevisions, proposals, quotationAcceptances } from "@/db/schema";
import { mapErpnextQuotationStatus } from "@/lib/erpnextStatus";
import { erpNextCommercialService } from "@/server/services/integrations/erpnext-commercial-service";
import { upsertQuotationReadModelFromERPNext } from "@/server/services/sales/quotation-read-model-service";
import { quotationRevisionLockKey } from "@/server/services/sales/domain/quotation-revision-state";

export { ERPNext_QUOTATION_EVENT_TOPIC } from "@/server/services/sales/quotation-topics";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function buildERPNextQuotationProposalProjection(input: {
  eventId: string;
  quotationId: string;
  existingConfigurationData: unknown;
  readModel: {
    status: string;
    grandTotal: string;
    revisionNumber: number;
    contentHash: string;
  };
  receivedAt?: Date;
}) {
  const totalPrice = Number(input.readModel.grandTotal);
  if (!Number.isFinite(totalPrice)) {
    throw new Error("ERPNext quotation read model contains an invalid grand total.");
  }

  const providerStatus = input.readModel.status;
  const mappedStatus = mapErpnextQuotationStatus(providerStatus);
  const receivedAt = input.receivedAt || new Date();
  const configurationData = {
    ...asRecord(input.existingConfigurationData),
    erpnextProviderProjection: {
      eventId: input.eventId,
      quotationId: input.quotationId,
      providerStatus,
      mappedStatus,
      readModelRevision: input.readModel.revisionNumber,
      readModelHash: input.readModel.contentHash,
      receivedAt: receivedAt.toISOString(),
    },
  };

  return {
    providerStatus,
    mappedStatus,
    receivedAt,
    proposalUpdate: {
      totalPrice,
      configurationData,
      ...(mappedStatus ? { status: mappedStatus } : {}),
    },
  };
}

export async function processERPNextQuotationEvent(input: {
  eventId: string;
  aggregateId: string;
  payload: JsonRecord;
}) {
  const payload = asRecord(input.payload);
  const quotationId = text(payload.quotationId) || input.aggregateId;
  if (!quotationId) throw new Error("ERPNext quotation event is missing its quotation identifier.");

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.erpnextQuotationId, quotationId),
  });
  if (!proposal) {
    console.warn("[ERPNext quotation event] No local proposal is bound to provider quotation", quotationId);
    return { ignored: true, reason: "UNBOUND_PROVIDER_QUOTATION", quotationId };
  }

  const document = await erpNextCommercialService.getQuotation(quotationId);
  if (!document) throw new Error(`ERPNext quotation ${quotationId} was not returned for event projection.`);
  const readModel = await upsertQuotationReadModelFromERPNext({
    proposalId: proposal.id,
    erpnextQuotationId: quotationId,
    document,
  });
  if (!readModel) {
    return {
      ignored: true,
      reason: "QUOTATION_NOT_CUSTOMER_PUBLISHABLE",
      proposalId: proposal.id,
      quotationId,
    };
  }

  const projectionResult = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${quotationRevisionLockKey(proposal.id)}))`,
    );
    const currentProposal = await tx.query.proposals.findFirst({
      where: eq(proposals.id, proposal.id),
    });
    if (!currentProposal) return { ignored: true as const, reason: "PROPOSAL_REMOVED" as const };

    const [acceptance, acceptedRevision] = await Promise.all([
      tx.query.quotationAcceptances.findFirst({
        where: eq(quotationAcceptances.proposalId, currentProposal.id),
        columns: { id: true },
      }),
      tx.query.proposalRevisions.findFirst({
        where: and(
          eq(proposalRevisions.proposalId, currentProposal.id),
          eq(proposalRevisions.status, "ACCEPTED"),
        ),
        columns: { id: true },
      }),
    ]);
    if (acceptance || acceptedRevision) {
      return { ignored: true as const, reason: "ACCEPTED_QUOTATION_IMMUTABLE" as const };
    }
    if (currentProposal.revisionNumber !== readModel.revisionNumber) {
      return { ignored: true as const, reason: "STALE_QUOTATION_REVISION" as const };
    }

    const projection = buildERPNextQuotationProposalProjection({
      eventId: input.eventId,
      quotationId,
      existingConfigurationData: currentProposal.configurationData,
      readModel,
    });
    await tx
      .update(proposals)
      .set({
        ...projection.proposalUpdate,
        updatedAt: projection.receivedAt,
      })
      .where(eq(proposals.id, currentProposal.id));
    return { ignored: false as const, projection };
  });

  if (projectionResult.ignored) {
    return {
      ignored: true,
      reason: projectionResult.reason,
      proposalId: proposal.id,
      quotationId,
    };
  }
  const { projection } = projectionResult;

  return {
    ignored: false,
    proposalId: proposal.id,
    quotationId,
    providerStatus: projection.providerStatus,
    mappedStatus: projection.mappedStatus,
    readModelHash: readModel.contentHash,
  };
}
