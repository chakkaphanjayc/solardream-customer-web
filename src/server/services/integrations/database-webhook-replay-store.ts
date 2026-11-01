import "server-only";

import { and, eq, lt } from "drizzle-orm";

import { db } from "@/db";
import { integrationWebhookEvents } from "@/db/schema";
import type { WebhookReplayStore } from "@/server/services/integrations/webhook-verifier";

export const WEBHOOK_PROCESSING_LEASE_MS = 10 * 60 * 1000;

/**
 * Persists provider event claims in the shared database. A PROCESSING claim
 * can be reclaimed after a bounded lease, which covers a worker crash between
 * the business transaction and the provider acknowledgement.
 */
export class DatabaseWebhookReplayStore implements WebhookReplayStore {
  constructor(
    private readonly provider: string,
    private readonly database: typeof db = db,
    private readonly now: () => number = Date.now,
  ) {
    if (!provider.trim()) throw new Error("A webhook provider namespace is required.");
  }

  async claim(eventId: string, bodyHash: string) {
    const normalizedEventId = eventId.trim();
    const normalizedBodyHash = bodyHash.trim().toLowerCase();
    if (!normalizedEventId || !/^[a-f0-9]{64}$/.test(normalizedBodyHash)) {
      throw new Error("Webhook replay claim is incomplete.");
    }

    const [inserted] = await this.database.insert(integrationWebhookEvents)
      .values({
        provider: this.provider,
        eventId: normalizedEventId,
        bodySha256: normalizedBodyHash,
      })
      .onConflictDoNothing({
        target: [integrationWebhookEvents.provider, integrationWebhookEvents.eventId],
      })
      .returning({ id: integrationWebhookEvents.id });

    if (inserted) return "CLAIMED" as const;

    const existing = await this.database.query.integrationWebhookEvents.findFirst({
      where: and(
        eq(integrationWebhookEvents.provider, this.provider),
        eq(integrationWebhookEvents.eventId, normalizedEventId),
      ),
    });
    if (!existing) throw new Error("Webhook replay claim disappeared before it could be read.");
    if (existing.bodySha256 !== normalizedBodyHash) return "CONFLICT" as const;
    if (existing.status === "PROCESSED") return "REPLAY" as const;

    const now = this.now();
    const leaseCutoff = new Date(now - WEBHOOK_PROCESSING_LEASE_MS);
    const [reclaimed] = await this.database.update(integrationWebhookEvents)
      .set({
        status: "PROCESSING",
        receivedAt: new Date(now),
        processedAt: null,
        updatedAt: new Date(now),
      })
      .where(and(
        eq(integrationWebhookEvents.id, existing.id),
        eq(integrationWebhookEvents.status, "PROCESSING"),
        lt(integrationWebhookEvents.updatedAt, leaseCutoff),
      ))
      .returning({ id: integrationWebhookEvents.id });

    return reclaimed ? "CLAIMED" as const : "IN_PROGRESS" as const;
  }

  async complete(eventId: string, bodyHash: string) {
    const now = new Date(this.now());
    const [processed] = await this.database.update(integrationWebhookEvents)
      .set({
        status: "PROCESSED",
        processedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(integrationWebhookEvents.provider, this.provider),
        eq(integrationWebhookEvents.eventId, eventId.trim()),
        eq(integrationWebhookEvents.bodySha256, bodyHash.trim().toLowerCase()),
        eq(integrationWebhookEvents.status, "PROCESSING"),
      ))
      .returning({ id: integrationWebhookEvents.id });

    return Boolean(processed);
  }
}
