import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { quotationNegotiationEvents } from "@/db/schema";
import type { ProposalNegotiationEventDto } from "@/types/proposals";

type NegotiationExecutor = Pick<typeof db, "insert">;

export type QuotationNegotiationEventType =
  | "CUSTOMER_CHANGE_REQUEST"
  | "CUSTOMER_MESSAGE"
  | "STAFF_MESSAGE"
  | "STAFF_COUNTER_OFFER"
  | "REVISION_ISSUED"
  | "ACCEPTANCE_RECORDED";

export async function recordQuotationNegotiationEvent(
  executor: NegotiationExecutor,
  input: {
    proposalId: string;
    revisionId?: string | null;
    actorUserId?: string | null;
    eventType: QuotationNegotiationEventType;
    source: string;
    visibility?: "CUSTOMER" | "INTERNAL";
    message: string;
    pricingSnapshot?: Record<string, unknown>;
    termsSnapshot?: Record<string, unknown>;
    idempotencyKey?: string | null;
  },
) {
  const message = input.message.trim();
  if (!message) throw new Error("Negotiation event message is required.");
  const [event] = await executor
    .insert(quotationNegotiationEvents)
    .values({
      proposalId: input.proposalId,
      revisionId: input.revisionId || null,
      actorUserId: input.actorUserId || null,
      eventType: input.eventType,
      source: input.source,
      visibility: input.visibility || "CUSTOMER",
      message,
      pricingSnapshot: input.pricingSnapshot || {},
      termsSnapshot: input.termsSnapshot || {},
      idempotencyKey: input.idempotencyKey || null,
    })
    .onConflictDoNothing({
      target: [quotationNegotiationEvents.proposalId, quotationNegotiationEvents.idempotencyKey],
      where: sql`${quotationNegotiationEvents.idempotencyKey} IS NOT NULL`,
    })
    .returning();
  return event || null;
}

export async function listQuotationNegotiationEvents(
  proposalId: string,
  options: { includeInternal?: boolean } = {},
): Promise<ProposalNegotiationEventDto[]> {
  let rows: Array<{
    id: string;
    proposalId: string;
    revisionId: string | null;
    eventType: string;
    source: string;
    visibility: string;
    message: string;
    createdAt: Date;
  }>;
  try {
    rows = await db.query.quotationNegotiationEvents.findMany({
      where: options.includeInternal
        ? eq(quotationNegotiationEvents.proposalId, proposalId)
        : and(
            eq(quotationNegotiationEvents.proposalId, proposalId),
            eq(quotationNegotiationEvents.visibility, "CUSTOMER"),
          ),
      orderBy: [asc(quotationNegotiationEvents.createdAt)],
      columns: {
        id: true,
        proposalId: true,
        revisionId: true,
        eventType: true,
        source: true,
        visibility: true,
        message: true,
        createdAt: true,
      },
    });
  } catch (error) {
    const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
    const cause = record.cause && typeof record.cause === "object" ? record.cause as Record<string, unknown> : {};
    if (record.code === "42P01" || cause.code === "42P01") return [];
    throw error;
  }
  return rows.map((row) => ({
    id: row.id,
    proposalId: row.proposalId,
    revisionId: row.revisionId,
    eventType: row.eventType,
    source: row.source,
    visibility: row.visibility === "INTERNAL" ? "INTERNAL" : "CUSTOMER",
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listCustomerQuotationNegotiationEvents(
  proposalId: string,
): Promise<ProposalNegotiationEventDto[]> {
  return listQuotationNegotiationEvents(proposalId);
}
