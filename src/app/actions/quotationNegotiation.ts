"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { activityLogs, proposalRevisions, proposals } from "@/db/schema";
import { requireStaff } from "@/lib/auth-guard";
import { recordQuotationNegotiationEvent } from "@/server/services/sales/quotation-negotiation-service";

type CounterOfferInput = {
  proposalId: string;
  revisionId?: string | null;
  message: string;
  pricingSnapshot?: Record<string, unknown>;
  termsSnapshot?: Record<string, unknown>;
  idempotencyKey: string;
};

export async function recordQuotationCounterOffer(input: CounterOfferInput) {
  const actor = await requireStaff();
  const proposalId = input.proposalId.trim();
  const message = input.message.trim();
  const idempotencyKey = input.idempotencyKey.trim();
  if (!proposalId || !message || !idempotencyKey) return { success: false as const, error: "Proposal, message, and idempotency key are required." };

  const proposal = await db.query.proposals.findFirst({ where: eq(proposals.id, proposalId) });
  if (!proposal) return { success: false as const, error: "Quotation was not found." };
  const revision = input.revisionId
    ? await db.query.proposalRevisions.findFirst({ where: and(eq(proposalRevisions.id, input.revisionId), eq(proposalRevisions.proposalId, proposalId)) })
    : null;

  const event = await db.transaction(async (tx) => {
    const negotiationEvent = await recordQuotationNegotiationEvent(tx, {
      proposalId,
      revisionId: revision?.id,
      actorUserId: actor.id,
      eventType: "STAFF_COUNTER_OFFER",
      source: "STAFF_WORKBENCH",
      visibility: "CUSTOMER",
      message,
      pricingSnapshot: input.pricingSnapshot,
      termsSnapshot: input.termsSnapshot,
      idempotencyKey,
    });
    if (!negotiationEvent) return null;
    await tx.insert(activityLogs).values({
      entityId: proposalId,
      entityType: "QUOTATION",
      action: "STAFF_COUNTER_OFFER_RECORDED",
      description: message.slice(0, 500),
      userId: actor.id,
    });
    return negotiationEvent;
  });
  return {
    success: true as const,
    eventId: event?.id || null,
    event: event
      ? {
          id: event.id,
          proposalId: event.proposalId,
          revisionId: event.revisionId,
          eventType: event.eventType,
          source: event.source,
          visibility: event.visibility,
          message: event.message,
          createdAt: event.createdAt.toISOString(),
        }
      : null,
  };
}
