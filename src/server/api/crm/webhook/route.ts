import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { validateUploadContentLength } from "@/lib/fileValidation";
import { readBoundedRequestBody } from "@/lib/webhookBody";
import { hasValidHeaderSecret } from "@/lib/secretAuth";
import { enqueueIntegrationEvent } from "@/lib/integrationOutbox";
import { processOutboxBestEffort } from "@/lib/outboxProcessor";
import { DatabaseWebhookReplayStore } from "@/server/services/integrations/database-webhook-replay-store";
import { getERPNextSetting } from "@/server/services/integrations/erpnext-transport";
import {
  claimWebhookEvent,
  hashWebhookBody,
  resolveWebhookEventId,
  verifyRawWebhookSignature,
  verifyWebhook,
  WebhookEventIdError,
  webhookAcknowledgement,
} from "@/server/services/integrations/webhook-verifier";
import { ERPNext_QUOTATION_EVENT_TOPIC } from "@/server/services/sales/quotation-topics";

const MAX_CRM_WEBHOOK_BODY_BYTES = 64 * 1024;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function getWebhookSecret() {
  return (process.env.ERPNEXT_WEBHOOK_SECRET?.trim() || await getERPNextSetting("erpnext_webhook_secret") || "").trim();
}

async function verifyAndClaimWebhook(request: NextRequest, rawBytes: Uint8Array, payload: Record<string, unknown>) {
  const secret = await getWebhookSecret();
  if (!secret) throw new Error("ERPNext webhook secret is not configured.");

  const bodyHash = hashWebhookBody(rawBytes);
  const eventId = resolveWebhookEventId({
    rawBody: rawBytes,
    payload,
    headerEventIds: [
      request.headers.get("x-solardream-event-id"),
      request.headers.get("x-erpnext-event-id"),
    ],
  });
  const replayStore = new DatabaseWebhookReplayStore("erpnext-crm-quotation");
  const timestamp = request.headers.get("x-solardream-timestamp")?.trim()
    || request.headers.get("x-erpnext-webhook-timestamp")?.trim()
    || "";
  const signature = request.headers.get("x-solardream-signature")?.trim()
    || request.headers.get("x-erpnext-webhook-signature")?.trim()
    || "";

  if (timestamp || signature) {
    if (timestamp) {
      return verifyWebhook({ rawBody: rawBytes, signature, timestamp, eventId, secret }, replayStore);
    }
    verifyRawWebhookSignature({ rawBody: rawBytes, signature, secret });
    return claimWebhookEvent(replayStore, eventId, bodyHash);
  }

  // Compatibility for the existing ERPNext callback while the provider-side
  // event-id/timestamp contract is rolled out. It still gets a durable replay
  // claim, but new callbacks should use the signed headers above.
  const legacySecret = request.headers.get("x-solardream-webhook-secret")
    || request.headers.get("x-erpnext-webhook-secret");
  if (!hasValidHeaderSecret(legacySecret, secret)) throw new Error("Webhook signature is invalid.");
  return claimWebhookEvent(replayStore, eventId, bodyHash);
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = validateUploadContentLength(req.headers, MAX_CRM_WEBHOOK_BODY_BYTES);
    if (!contentLength.ok) return NextResponse.json({ success: false, error: contentLength.error }, { status: contentLength.status });
    const rawBody = await readBoundedRequestBody(req, MAX_CRM_WEBHOOK_BODY_BYTES, contentLength.value);
    const rawBytes = Buffer.from(rawBody, "utf8");
    const bodyHash = hashWebhookBody(rawBytes);
    const parsedBody: unknown = JSON.parse(rawBody);
    const payload = asRecord(parsedBody);
    const verification = await verifyAndClaimWebhook(req, rawBytes, payload);
    const eventId = verification.eventId;
    const acknowledgement = webhookAcknowledgement(verification);
    if (acknowledgement) {
      return NextResponse.json(acknowledgement.body, {
        status: acknowledgement.status,
        headers: acknowledgement.headers,
      });
    }

    const quotationId = typeof payload.quotation_id === "string" ? payload.quotation_id.trim() : "";
    if (!quotationId) {
      await new DatabaseWebhookReplayStore("erpnext-crm-quotation").complete(eventId, bodyHash);
      return NextResponse.json({ success: false, error: "Missing quotation_id" }, { status: 400 });
    }

    await enqueueIntegrationEvent(db, {
      topic: ERPNext_QUOTATION_EVENT_TOPIC,
      aggregateType: "ERPNEXT_QUOTATION",
      aggregateId: quotationId,
      correlationId: eventId,
      payload: {
        quotationId,
        eventId,
        bodySha256: bodyHash,
      },
      dedupeKey: `erpnext.quotation.event:${eventId}`,
    });
    await processOutboxBestEffort(quotationId);
    await new DatabaseWebhookReplayStore("erpnext-crm-quotation").complete(eventId, bodyHash);

    return NextResponse.json({
      success: true,
      queued: true,
      eventId,
    });
  } catch (error: unknown) {
    console.error("[CRM ERPNext Webhook]:", error);
    if (error instanceof WebhookEventIdError) {
      return NextResponse.json({ success: false, error: "Invalid webhook event ID." }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
