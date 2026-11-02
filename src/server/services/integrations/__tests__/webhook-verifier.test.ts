import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

import { db } from "@/db";
import { integrationWebhookEvents } from "@/db/schema";
import {
  DatabaseWebhookReplayStore,
  WEBHOOK_PROCESSING_LEASE_MS,
} from "@/server/services/integrations/database-webhook-replay-store";
import {
  resolveWebhookEventId,
  hashWebhookBody,
  verifyRawWebhookSignature,
  verifyWebhook,
  webhookAcknowledgement,
  WebhookEventIdError,
  type WebhookReplayClaim,
} from "@/server/services/integrations/webhook-verifier";

const TEST_SECRET = "webhook-test-secret-not-for-production";
const dialect = new PgDialect();

function assertSqlPredicate(
  condition: SQL | undefined,
  expectedColumns: readonly string[],
  expectedValues: readonly (string | Date)[] = [],
) {
  assert.ok(condition, "expected a database predicate");
  const query = dialect.sqlToQuery(condition);
  for (const column of expectedColumns) {
    assert.ok(query.sql.includes(`\"${column}\"`), `expected SQL predicate to include ${column}: ${query.sql}`);
  }
  const normalizeParameter = (value: unknown) => {
    if (value instanceof Date) return value.getTime().toString();
    if (typeof value === "string") {
      const parsedDate = Date.parse(value);
      if (Number.isFinite(parsedDate) && /\d{4}-\d{2}-\d{2}/.test(value)) return String(parsedDate);
    }
    return String(value);
  };
  const parameters = query.params.map(normalizeParameter);
  for (const value of expectedValues) {
    const normalized = normalizeParameter(value);
    assert.ok(parameters.includes(normalized), `expected SQL predicate to bind ${normalized}: ${query.sql}`);
  }
}

function signedRequest(rawBody: Uint8Array, timestamp: string) {
  const signature = createHmac("sha256", TEST_SECRET)
    .update(timestamp)
    .update(".")
    .update(rawBody)
    .digest("hex");
  return { signature, timestamp };
}

type FakeEvent = {
  id: string;
  provider: string;
  eventId: string;
  bodySha256: string;
  status: "PROCESSING" | "PROCESSED";
  receivedAt: Date;
  processedAt: Date | null;
  updatedAt: Date;
};

function createReplayDatabase(now: () => number) {
  let event: FakeEvent | null = null;
  const database = {
    insert: () => ({
      values: (value: { provider: string; eventId: string; bodySha256: string }) => ({
        onConflictDoNothing: (options: { target?: unknown[] }) => {
          assert.deepEqual(options.target, [integrationWebhookEvents.provider, integrationWebhookEvents.eventId]);
          return {
          returning: async () => {
            if (event) return [];
            const inserted: FakeEvent = {
              id: "event-row-1",
              ...value,
              status: "PROCESSING",
              receivedAt: new Date(now()),
              processedAt: null,
              updatedAt: new Date(now()),
            };
            event = inserted;
            return [{ id: inserted.id }];
          },
          };
        },
      }),
    }),
    query: {
      integrationWebhookEvents: {
        findFirst: async (query: { where?: SQL }) => {
          assertSqlPredicate(query.where, ["provider", "event_id"], [event?.provider || "", event?.eventId || ""]);
          return event ? { ...event } : undefined;
        },
      },
    },
    update: () => ({
      set: (values: Partial<FakeEvent>) => ({
        where: (condition: SQL) => {
          assertSqlPredicate(
            condition,
            values.status === "PROCESSING"
              ? ["id", "status", "updated_at"]
              : ["provider", "event_id", "body_sha256", "status"],
            values.status === "PROCESSING"
              ? [
                  event?.id || "",
                  "PROCESSING",
                  new Date(now() - WEBHOOK_PROCESSING_LEASE_MS),
                ]
              : [event?.provider || "", event?.eventId || "", event?.bodySha256 || "", "PROCESSING"],
          );
          return {
          returning: async () => {
            if (!event) return [];
            if (values.status === "PROCESSING") {
              const cutoff = now() - WEBHOOK_PROCESSING_LEASE_MS;
              if (event.status !== "PROCESSING" || event.updatedAt.getTime() >= cutoff) return [];
            } else if (values.status === "PROCESSED" && event.status !== "PROCESSING") {
              return [];
            }
            event = { ...event, ...values };
            return [{ id: event.id }];
          },
          };
        },
      }),
    }),
  } as unknown as typeof db;

  return { database, getEvent: () => event };
}

test("0117 migration adds nullable request idempotency columns and the partial unique index", () => {
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const migrationPath = resolve(testDirectory, "../../../../../drizzle/0117_inbound_request_idempotency.sql");
  const migration = readFileSync(migrationPath, "utf8");

  assert.match(migration, /ADD COLUMN IF NOT EXISTS idempotency_key text/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS idempotency_hash text/i);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS inbound_requests_idempotency_key/i);
  assert.match(migration, /WHERE idempotency_key IS NOT NULL/i);
});

test("CRM webhook processes the quotation aggregate only after durable enqueue and replay completion", () => {
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const routePath = resolve(testDirectory, "../../../api/crm/webhook/route.ts");
  const route = readFileSync(routePath, "utf8");
  const enqueueIndex = route.indexOf("await enqueueIntegrationEvent(db,");
  const processOutboxIndex = route.indexOf("await processOutboxBestEffort(quotationId);", enqueueIndex);
  const replayCompleteIndex = route.indexOf(
    'await new DatabaseWebhookReplayStore("erpnext-crm-quotation").complete(eventId, bodyHash);',
    processOutboxIndex,
  );

  assert.ok(enqueueIndex >= 0, "webhook should durably enqueue its provider event");
  assert.ok(processOutboxIndex > enqueueIndex, "aggregate delivery starts after durable enqueue");
  assert.ok(replayCompleteIndex > processOutboxIndex, "replay claim completes after the best-effort delivery attempt");
  assert.doesNotMatch(route, /payload\.status/, "webhook status must not override the fetched ERPNext document");
});

test("signed body ID is authoritative and mismatched event ID headers are rejected", () => {
  const rawBody = Buffer.from(JSON.stringify({ event_id: "evt-signed-1", quotation_id: "QTN-1" }));

  assert.equal(resolveWebhookEventId({
    rawBody,
    payload: { event_id: "evt-signed-1" },
    headerEventIds: ["evt-signed-1"],
  }), "evt-signed-1");
  assert.throws(() => resolveWebhookEventId({
    rawBody,
    payload: { event_id: "evt-signed-1" },
    headerEventIds: ["evt-tampered-2"],
  }), WebhookEventIdError);
  assert.throws(() => resolveWebhookEventId({
    rawBody,
    payload: { event_id: "evt-signed-1", eventId: "evt-conflict-2" },
  }), WebhookEventIdError);
});

test("header-only event IDs cannot vary the replay key when absent from the signed payload", () => {
  const rawBody = Buffer.from(JSON.stringify({ quotation_id: "QTN-1" }));
  const first = resolveWebhookEventId({ rawBody, payload: { quotation_id: "QTN-1" }, headerEventIds: ["evt-header-a"] });
  const second = resolveWebhookEventId({ rawBody, payload: { quotation_id: "QTN-1" }, headerEventIds: ["evt-header-b"] });

  assert.equal(first, second);
  assert.match(first, /^crm-quotation-[a-f0-9]{64}$/);
});

test("signature verification rejects changed payload bytes before claiming an event", async () => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = Buffer.from(JSON.stringify({ event_id: "evt-tamper", quotation_id: "QTN-1" }));
  const { signature } = signedRequest(rawBody, timestamp);
  let claimCount = 0;
  const store = {
    claim: async (): Promise<WebhookReplayClaim> => {
      claimCount += 1;
      return "CLAIMED";
    },
  };

  await verifyWebhook({ rawBody, signature, timestamp, eventId: "evt-tamper", secret: TEST_SECRET }, store);
  const changedBody = Buffer.from(JSON.stringify({ event_id: "evt-tamper", quotation_id: "QTN-2" }));
  await assert.rejects(
    () => verifyWebhook({ rawBody: changedBody, signature, timestamp, eventId: "evt-tamper", secret: TEST_SECRET }, store),
    /signature is invalid/,
  );
  assert.equal(claimCount, 1);

  const rawSignature = createHmac("sha256", TEST_SECRET).update(rawBody).digest("hex");
  assert.doesNotThrow(() => verifyRawWebhookSignature({ rawBody, signature: rawSignature, secret: TEST_SECRET }));
  assert.throws(() => verifyRawWebhookSignature({ rawBody: changedBody, signature: rawSignature, secret: TEST_SECRET }), /signature is invalid/);
});

test("same event ID with a different validly signed payload is rejected as a replay conflict", async () => {
  const now = Date.now();
  const timestamp = String(Math.floor(now / 1000));
  const replayDatabase = createReplayDatabase(() => now);
  const store = new DatabaseWebhookReplayStore("erpnext-test", replayDatabase.database, () => now);
  const firstBody = Buffer.from(JSON.stringify({ event_id: "evt-conflict-1", quotation_id: "QTN-1" }));
  const changedBody = Buffer.from(JSON.stringify({ event_id: "evt-conflict-1", quotation_id: "QTN-2" }));
  const firstSignature = signedRequest(firstBody, timestamp).signature;
  const changedSignature = signedRequest(changedBody, timestamp).signature;

  await verifyWebhook({ rawBody: firstBody, signature: firstSignature, timestamp, eventId: "evt-conflict-1", secret: TEST_SECRET, now: new Date(now) }, store);
  await assert.rejects(
    () => verifyWebhook({ rawBody: changedBody, signature: changedSignature, timestamp, eventId: "evt-conflict-1", secret: TEST_SECRET, now: new Date(now) }, store),
    /reused with a different payload/,
  );
});

test("concurrent duplicates receive retryable status until a crashed claim can be reclaimed", async () => {
  let now = Date.now();
  const replayDatabase = createReplayDatabase(() => now);
  const store = new DatabaseWebhookReplayStore("erpnext-test", replayDatabase.database, () => now);
  const rawBody = Buffer.from(JSON.stringify({ event_id: "evt-crash-1", quotation_id: "QTN-1" }));
  const timestamp = String(Math.floor(now / 1000));
  const { signature } = signedRequest(rawBody, timestamp);
  const verify = () => verifyWebhook({
    rawBody,
    signature,
    timestamp,
    eventId: "evt-crash-1",
    secret: TEST_SECRET,
    now: new Date(now),
    toleranceSeconds: 20 * 60,
  }, store);

  const [first, concurrentDuplicate] = await Promise.all([verify(), verify()]);
  assert.equal(first.inProgress, false);
  assert.equal(webhookAcknowledgement(first), null);

  // The initial delivery crashes before completing its durable claim.
  assert.equal(concurrentDuplicate.replayed, false);
  assert.equal(concurrentDuplicate.inProgress, true);
  assert.deepEqual(webhookAcknowledgement(concurrentDuplicate), {
    status: 503,
    headers: { "Retry-After": "10" },
    body: { success: false, error: "Webhook event is still being processed.", retryable: true },
  });

  now += WEBHOOK_PROCESSING_LEASE_MS + 1;
  const retryAfterLease = await verify();
  assert.equal(retryAfterLease.inProgress, false);
  assert.equal(webhookAcknowledgement(retryAfterLease), null);
  assert.equal(replayDatabase.getEvent()?.status, "PROCESSING");

  assert.equal(await store.complete("evt-crash-1", hashWebhookBody(rawBody)), true);
  const completedDuplicate = await verify();
  assert.equal(completedDuplicate.replayed, true);
  assert.equal(completedDuplicate.inProgress, false);
  assert.deepEqual(webhookAcknowledgement(completedDuplicate), {
    status: 200,
    body: { success: true, replayed: true },
  });
});
