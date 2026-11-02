import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { quotationAcceptances } from "@/db/schema";
import type { ProposalAcceptanceDto } from "@/types/proposals";

function isMissingRelationError(error: unknown) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const cause = record.cause && typeof record.cause === "object" ? record.cause as Record<string, unknown> : {};
  return record.code === "42P01" || cause.code === "42P01";
}

function mapStatus(value: string): ProposalAcceptanceDto["status"] {
  return value === "ORDER_PENDING" || value === "ORDER_CREATED" || value === "ORDER_FAILED"
    ? value
    : "RECORDED";
}

export async function getQuotationAcceptanceSummary(
  proposalId: string,
): Promise<ProposalAcceptanceDto | null> {
  try {
    const row = await db.query.quotationAcceptances.findFirst({
      where: eq(quotationAcceptances.proposalId, proposalId),
      orderBy: [desc(quotationAcceptances.acceptedAt)],
      columns: {
        status: true,
        revisionNumber: true,
        erpnextQuotationId: true,
        providerSalesOrderId: true,
        acceptedAt: true,
      },
    });
    return row
      ? {
          status: mapStatus(row.status),
          revisionNumber: row.revisionNumber,
          erpnextQuotationId: row.erpnextQuotationId,
          providerSalesOrderId: row.providerSalesOrderId,
          acceptedAt: row.acceptedAt.toISOString(),
        }
      : null;
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
}
