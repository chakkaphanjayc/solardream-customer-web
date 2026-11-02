import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type WebhookReplayClaim = "CLAIMED" | "REPLAY" | "IN_PROGRESS" | "CONFLICT";
export interface WebhookReplayStore { claim(eventId: string, bodyHash: string): Promise<WebhookReplayClaim>; }
export type VerifiedWebhook = { eventId: string; replayed: boolean; inProgress: boolean };
export type WebhookAcknowledgement = {
  status: 200 | 503;
  body: { success: true; replayed: true } | { success: false; error: string; retryable: true };
  headers?: Record<string, string>;
};

export class WebhookEventIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookEventIdError";
  }
}

export function resolveWebhookEventId(input: {
  rawBody: Uint8Array;
  payload: Record<string, unknown>;
  headerEventIds?: readonly (string | null)[];
}) {
  const bodyIds = [input.payload.event_id, input.payload.eventId]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const headerIds = (input.headerEventIds || [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
  const bodyId = [...new Set(bodyIds)];
  const headerId = [...new Set(headerIds)];

  if (bodyId.length > 1) throw new WebhookEventIdError("Webhook payload contains conflicting event IDs.");
  if (headerId.length > 1) throw new WebhookEventIdError("Webhook headers contain conflicting event IDs.");
  if (bodyId[0] && headerId[0] && bodyId[0] !== headerId[0]) {
    throw new WebhookEventIdError("Webhook event ID header does not match the signed payload.");
  }

  // The signed body is authoritative. When it has no ID, derive one from the
  // signed bytes instead of trusting an unsigned header that can be changed
  // during replay.
  return bodyId[0] || `crm-quotation-${hashWebhookBody(input.rawBody)}`;
}

export async function claimWebhookEvent(
  store: WebhookReplayStore,
  eventId: string,
  bodyHash: string,
): Promise<VerifiedWebhook> {
  const claim = await store.claim(eventId, bodyHash);
  if (claim === "CONFLICT") throw new Error("Webhook event ID was reused with a different payload.");
  return { eventId, replayed: claim === "REPLAY", inProgress: claim === "IN_PROGRESS" };
}

export function webhookAcknowledgement(verification: VerifiedWebhook): WebhookAcknowledgement | null {
  if (verification.inProgress) {
    return {
      status: 503,
      headers: { "Retry-After": "10" },
      body: { success: false, error: "Webhook event is still being processed.", retryable: true },
    };
  }
  if (verification.replayed) {
    return { status: 200, body: { success: true, replayed: true } };
  }
  return null;
}

export async function verifyWebhook(input: { rawBody: Uint8Array; signature: string; timestamp: string; eventId: string; secret: string; now?: Date; toleranceSeconds?: number }, store: WebhookReplayStore): Promise<VerifiedWebhook> {
  const numericTimestamp = Number(input.timestamp);
  const parsedTimestamp = Number.isFinite(numericTimestamp)
    ? numericTimestamp
    : Date.parse(input.timestamp) / 1000;
  const epoch = Math.floor(parsedTimestamp);
  const now = Math.floor((input.now ?? new Date()).valueOf() / 1000);
  if (!Number.isInteger(epoch) || Math.abs(now - epoch) > (input.toleranceSeconds ?? 300)) throw new Error("Webhook timestamp is outside the accepted window.");
  if (!input.eventId.trim() || !input.secret) throw new Error("Webhook verification is incomplete.");
  const expected = createHmac("sha256", input.secret).update(input.timestamp).update(".").update(input.rawBody).digest("hex");
  const supplied = input.signature.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) throw new Error("Webhook signature is invalid.");
  const bodyHash = hashWebhookBody(input.rawBody);
  return claimWebhookEvent(store, input.eventId, bodyHash);
}

export function hashWebhookBody(rawBody: Uint8Array) {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function verifyRawWebhookSignature(input: { rawBody: Uint8Array; signature: string; secret: string }) {
  if (!input.secret) throw new Error("Webhook verification is incomplete.");
  const expected = createHmac("sha256", input.secret).update(input.rawBody).digest("hex");
  const supplied = input.signature.trim().replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(supplied) || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied.toLowerCase()))) {
    throw new Error("Webhook signature is invalid.");
  }
}
