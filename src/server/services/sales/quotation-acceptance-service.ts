import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { integrationOutbox, proposalRevisions, proposals, quotationAcceptances, signatureEnvelopes } from "@/db/schema";
import {
  createErpnextSalesOrderFromQuotation,
  getErpnextSalesOrder,
  getProjectBySalesOrder,
} from "@/lib/erpnext";
import {
  markErpnextQuotationAccepted,
  updateErpnextQuotationSignatureAudit,
} from "@/lib/pdf-signer";
import { broadcastAdminEvent } from "@/lib/sse-publisher";

export { QUOTATION_ACCEPTED_COMMAND_TOPIC } from "@/server/services/sales/quotation-topics";

type JsonRecord = Record<string, unknown>;

export type QuotationAcceptedCommand = {
  eventId: string;
  aggregateId: string;
  dedupeKey: string | null;
  providerReference: string | null;
  payload: JsonRecord;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function existingGoldenThreadState(configurationData: unknown) {
  const state = asRecord(asRecord(configurationData).goldenThread);
  return {
    salesOrderId: text(state.salesOrderId) || null,
    projectId: text(state.projectId) || null,
  };
}

async function waitForProjectBySalesOrder(salesOrderId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const project = await getProjectBySalesOrder(salesOrderId);
    if (project) return project;
    if (attempt < 4) await new Promise<void>((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

async function resolveExistingSalesOrder(providerReference: string | null) {
  if (!providerReference) return null;
  try {
    const salesOrder = await getErpnextSalesOrder(providerReference);
    return number(salesOrder.docstatus) === 1 ? salesOrder : null;
  } catch {
    return null;
  }
}

export async function processQuotationAcceptedCommand(event: QuotationAcceptedCommand) {
  const payload = asRecord(event.payload);
  const proposalId = text(payload.proposalId) || event.aggregateId;
  const quotationId = text(payload.quotationId);
  const signedAt = text(payload.signedAt);
  const signedHash = text(payload.signedHash);
  const sourceDocumentHash = text(payload.sourceDocumentHash);
  const revisionId = text(payload.revisionId);
  const signerIpAddress = text(payload.signerIpAddress) || "unknown";
  const signerUserAgent = text(payload.signerUserAgent) || "unknown";
  const verificationUrl = text(payload.verificationUrl);
  if (!proposalId || !quotationId || !signedAt || !signedHash || !sourceDocumentHash || !revisionId || !verificationUrl) {
    throw new Error("Quotation acceptance command is missing immutable signature evidence.");
  }
  if (!/^[a-f0-9]{64}$/.test(signedHash) || !/^[a-f0-9]{64}$/.test(sourceDocumentHash)) {
    throw new Error("Quotation acceptance command contains an invalid document hash.");
  }

  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
  });
  if (!proposal) throw new Error("Quotation acceptance command references a missing proposal.");
  if (proposal.erpnextQuotationId !== quotationId) {
    throw new Error("Quotation acceptance command does not match the proposal ERPNext binding.");
  }
  const revision = await db.query.proposalRevisions.findFirst({
    where: and(eq(proposalRevisions.id, revisionId), eq(proposalRevisions.proposalId, proposal.id)),
  });
  if (!revision || revision.status !== "ACCEPTED" || revision.documentHash !== sourceDocumentHash) {
    throw new Error("Quotation acceptance command does not match the accepted revision evidence.");
  }
  if (number(payload.revisionNumber, -1) !== revision.revisionNumber) {
    throw new Error("Quotation acceptance command does not match the accepted revision number.");
  }
  const acceptance = await db.query.quotationAcceptances.findFirst({
    where: and(
      eq(quotationAcceptances.proposalId, proposal.id),
      eq(quotationAcceptances.revisionId, revision.id),
      eq(quotationAcceptances.erpnextQuotationId, quotationId),
      eq(quotationAcceptances.sourceDocumentHash, sourceDocumentHash),
    ),
  });
  if (
    !acceptance
    || acceptance.signedDocumentHash !== signedHash
    || acceptance.revisionNumber !== revision.revisionNumber
  ) {
    throw new Error("Quotation acceptance command has no matching acceptance ledger entry.");
  }
  const envelope = await db.query.signatureEnvelopes.findFirst({
    where: and(
      eq(signatureEnvelopes.id, acceptance.signatureEnvelopeId),
      eq(signatureEnvelopes.revisionId, acceptance.revisionId),
      eq(signatureEnvelopes.revisionId, revision.id),
      eq(signatureEnvelopes.status, "SIGNED"),
      eq(signatureEnvelopes.documentHash, sourceDocumentHash),
    ),
    columns: { id: true },
  });
  if (!envelope || envelope.id !== acceptance.signatureEnvelopeId) {
    throw new Error("Quotation acceptance command has no matching signed envelope for its revision.");
  }

  const handoffStartedAt = new Date();
  await db
    .update(quotationAcceptances)
    .set({ status: "ORDER_PENDING", failureReason: null, updatedAt: handoffStartedAt })
    .where(eq(quotationAcceptances.id, acceptance.id));

  const acceptanceKey = event.dedupeKey || `commercial.quotation.accepted:${proposalId}`;
  try {
    await updateErpnextQuotationSignatureAudit({
      quotationId,
      sha256Hash: signedHash,
      signedAt,
      signerIpAddress,
      signerUserAgent,
      verificationUrl,
    });
    await markErpnextQuotationAccepted(quotationId);

    const reusedOrder = await resolveExistingSalesOrder(event.providerReference || acceptance.providerSalesOrderId);
    const salesOrder = reusedOrder
      ? { salesOrderName: text(reusedOrder.name), reused: true }
      : await createErpnextSalesOrderFromQuotation(quotationId, acceptanceKey);
    if (!salesOrder.salesOrderName) throw new Error("ERPNext Sales Order identifier is missing after acceptance.");

    await db
      .update(quotationAcceptances)
      .set({ status: "ORDER_CREATED", providerSalesOrderId: salesOrder.salesOrderName, failureReason: null, updatedAt: new Date() })
      .where(eq(quotationAcceptances.id, acceptance.id));

    await db
      .update(integrationOutbox)
      .set({ providerReference: salesOrder.salesOrderName, updatedAt: new Date() })
      .where(eq(integrationOutbox.id, event.eventId));

    const project = await waitForProjectBySalesOrder(salesOrder.salesOrderName);
    const projectId = project ? text(project.name) || null : null;
    if (projectId) broadcastAdminEvent("PROJECT_CREATED", { projectId });

    const configurationData = asRecord(proposal.configurationData);
    const prior = existingGoldenThreadState(configurationData);
    const goldenThread = {
      status: projectId ? "PROJECT_CREATED" : "SALES_ORDER_SUBMITTED",
      quotationId,
      salesOrderId: salesOrder.salesOrderName,
      projectId,
      updatedAt: new Date().toISOString(),
    } as const;
    await db
      .update(proposals)
      .set({
        configurationData: {
          ...configurationData,
          goldenThread,
          commercialHandoff: {
            status: "COMPLETED",
            commandEventId: event.eventId,
            acceptanceKey,
            revisionId,
            revisionNumber: revision.revisionNumber,
            signedHash,
            salesOrderId: salesOrder.salesOrderName,
            reused: salesOrder.reused,
            completedAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, proposal.id));

    return {
      proposalId: proposal.id,
      quotationId,
      salesOrderId: salesOrder.salesOrderName,
      projectId,
      reusedSalesOrder: salesOrder.reused,
      reconciledFromSalesOrder: Boolean(prior.salesOrderId),
    };
  } catch (error) {
    const failureReason = error instanceof Error ? error.message.slice(0, 1_000) : "Quotation handoff failed.";
    await db
      .update(quotationAcceptances)
      .set({ status: "ORDER_FAILED", failureReason, updatedAt: new Date() })
      .where(eq(quotationAcceptances.id, acceptance.id));
    throw error;
  }
}
