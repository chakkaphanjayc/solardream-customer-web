import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { getSystemConfig, getSystemSetting, type SystemConfig } from "@/app/actions/systemSettings";
import { db } from "@/db";
import { proposalRevisions, proposals, quotationAcceptances, users } from "@/db/schema";
import { isRequestContentLengthExceeded } from "@/lib/requestSize";
import { hasValidHeaderSecret } from "@/lib/secretAuth";
import { getRequestOrigin } from "@/lib/siteUrl";
import { quotationRevisionLockKey } from "@/server/services/sales/domain/quotation-revision-state";


const erpnextItemSchema = z
  .object({
    item_code: z.string().optional(),
    item_name: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    qty: z.coerce.number().finite().optional(),
    rate: z.coerce.number().finite().optional(),
    amount: z.coerce.number().finite().optional(),
  })
  .passthrough();

const erpnextQuotationPayloadSchema = z.object({
  quotation_id: z.string().trim().min(1),
  customer_name: z.string().trim().min(1),
  customer_email: z.string().trim().email(),
  customer_phone: z.string().trim().optional().nullable(),
  grand_total: z.coerce.number().finite().nonnegative(),
  system_size_kw: z.coerce.number().finite().positive(),
  items: z.array(erpnextItemSchema).min(1),
  pdf_url: z.string().trim().url(),
});

type ErpnextQuotationPayload = z.infer<typeof erpnextQuotationPayloadSchema>;
type ErpnextQuotationItem = z.infer<typeof erpnextItemSchema>;

const MAX_ERPNEXT_QUOTATION_SYNC_BODY_BYTES = 1024 * 1024;

function validateWebhookSecret(request: NextRequest, expectedSecret: string) {
  if (!expectedSecret) return false;

  return (
    hasValidHeaderSecret(request.headers.get("x-solardream-webhook-secret"), expectedSecret) ||
    hasValidHeaderSecret(request.headers.get("x-erpnext-webhook-secret"), expectedSecret)
  );
}

function buildProposalSlug(quotationId: string, secret: string) {
  const cleanQuotationId = quotationId
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  if (!secret) {
    throw new Error("ERPNEXT_WEBHOOK_SECRET is required for quotation sync URL generation");
  }
  const signature = crypto
    .createHmac("sha256", secret)
    .update(quotationId)
    .digest("base64url")
    .slice(0, 12);

  return `${cleanQuotationId || "quotation"}-${signature}`;
}

function toDisplayName(item: ErpnextQuotationItem) {
  return item.item_name || item.name || item.description || item.item_code || "ERPNext quotation item";
}

function inferPanelCount(items: ErpnextQuotationPayload["items"]) {
  return items.reduce((total, item) => {
    const label = toDisplayName(item).toLowerCase();
    const isPanel = label.includes("panel") || label.includes("แผง");
    if (!isPanel) return total;
    return total + Math.max(0, Math.round(item.qty || 0));
  }, 0);
}

function assertSystemConfig(config: SystemConfig) {
  const missing = [
    ["erpnextUrl", config.erpnextUrl],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `System integration configuration is missing: ${missing.join(", ")}.`,
    );
  }
}

async function upsertCustomer(payload: ErpnextQuotationPayload) {
  const email = payload.customer_email.toLowerCase();
  const [customer] = await db
    .insert(users)
    .values({
      email,
      name: payload.customer_name,
      fullName: payload.customer_name,
      phoneNumber: payload.customer_phone || null,
      role: "USER",
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: payload.customer_name,
        fullName: payload.customer_name,
        ...(payload.customer_phone ? { phoneNumber: payload.customer_phone } : {}),
      },
    })
    .returning();

  return customer;
}

function buildConfigurationData(
  payload: ErpnextQuotationPayload,
  existingConfig: Record<string, unknown>,
  config: SystemConfig,
) {
  const receivedAt = new Date().toISOString();
  const items = payload.items.map((item) => ({
    itemCode: item.item_code || null,
    name: toDisplayName(item),
    description: item.description || null,
    quantity: item.qty ?? null,
    rate: item.rate ?? null,
    amount: item.amount ?? null,
    source: "erpnext",
  }));
  const syncHistory = Array.isArray(existingConfig.erpnextFinalizedQuotationSyncHistory)
    ? existingConfig.erpnextFinalizedQuotationSyncHistory
    : [];

  return {
    ...existingConfig,
    source: "erpnext-finalized-quotation",
    erpnextQuotation: {
      quotationId: payload.quotation_id,
      customerName: payload.customer_name,
      customerEmail: payload.customer_email.toLowerCase(),
      customerPhone: payload.customer_phone || null,
      grandTotal: payload.grand_total,
      systemSizeKw: payload.system_size_kw,
      pdfUrl: payload.pdf_url,
      receivedAt,
    },
    integration: {
      ...((existingConfig.integration && typeof existingConfig.integration === "object"
        ? existingConfig.integration
        : {}) as Record<string, unknown>),
      erpnextUrl: config.erpnextUrl,
    },
    items,
    summary: {
      ...((existingConfig.summary && typeof existingConfig.summary === "object"
        ? existingConfig.summary
        : {}) as Record<string, unknown>),
      grandTotal: payload.grand_total,
      systemSizeKw: payload.system_size_kw,
      finalizedBy: "erpnext",
      finalizedAt: receivedAt,
    },
    erpnextFinalizedQuotationSyncHistory: [
      ...syncHistory,
      {
        quotationId: payload.quotation_id,
        grandTotal: payload.grand_total,
        systemSizeKw: payload.system_size_kw,
        itemCount: payload.items.length,
        pdfUrl: payload.pdf_url,
        receivedAt,
      },
    ],
  };
}

function getBaseUrl(request: NextRequest) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");
  return getRequestOrigin(request.url, request.headers);
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret =
      process.env.ERPNEXT_WEBHOOK_SECRET?.trim() ||
      (await getSystemSetting("erpnext_webhook_secret"))?.trim() ||
      "";

    if (!webhookSecret) {
      return NextResponse.json(
        { success: false, error: "ERPNext webhook secret is not configured" },
        { status: 500 },
      );
    }

    if (!validateWebhookSecret(request, webhookSecret)) {
      return NextResponse.json({ success: false, error: "Invalid webhook secret" }, { status: 401 });
    }

    if (isRequestContentLengthExceeded(request.headers, MAX_ERPNEXT_QUOTATION_SYNC_BODY_BYTES)) {
      return NextResponse.json(
        { success: false, error: "ERPNext quotation payload is too large" },
        { status: 413 },
      );
    }

    const config = await getSystemConfig();
    assertSystemConfig(config);

    const rawPayload = await request.json().catch(() => null);
    const parsedPayload = erpnextQuotationPayloadSchema.safeParse(rawPayload);
    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid ERPNext quotation payload",
          issues: parsedPayload.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    const payload = parsedPayload.data;
    const customer = await upsertCustomer(payload);
    const panelCount = inferPanelCount(payload.items);
    const generatedProposalId = buildProposalSlug(payload.quotation_id, webhookSecret);
    const syncResult = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`erpnext-quotation-sync:${payload.quotation_id}`}))`,
      );

      const firstMatch = await tx.query.proposals.findFirst({
        where: eq(proposals.erpnextQuotationId, payload.quotation_id),
      });
      const firstLockId = firstMatch?.id || generatedProposalId;
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${quotationRevisionLockKey(firstLockId)}))`,
      );

      let existingProposal = await tx.query.proposals.findFirst({
        where: eq(proposals.erpnextQuotationId, payload.quotation_id),
      });
      if (existingProposal && existingProposal.id !== firstLockId) {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${quotationRevisionLockKey(existingProposal.id)}))`,
        );
        existingProposal = await tx.query.proposals.findFirst({
          where: eq(proposals.erpnextQuotationId, payload.quotation_id),
        });
      }

      const [latestRevision, acceptance] = existingProposal
        ? await Promise.all([
            tx.query.proposalRevisions.findFirst({
              where: eq(proposalRevisions.proposalId, existingProposal.id),
              orderBy: (revisions, { desc }) => [desc(revisions.revisionNumber)],
              columns: { status: true },
            }),
            tx.query.quotationAcceptances.findFirst({
              where: eq(quotationAcceptances.proposalId, existingProposal.id),
              columns: { id: true },
            }),
          ])
        : [null, null];
      const isImmutable = Boolean(
        acceptance
        || (latestRevision && ["SENT", "VIEWED", "ACCEPTED"].includes(latestRevision.status))
        || (existingProposal && (
          existingProposal.status !== "DRAFT"
          || existingProposal.dispatchStatus !== "PENDING_DISPATCH"
        )),
      );

      if (existingProposal && isImmutable) {
        return { proposal: existingProposal, preservedPublishedProposal: true };
      }

      const existingConfigurationData = existingProposal?.configurationData as Record<string, unknown> | undefined;
      const configurationData = buildConfigurationData(
        payload,
        existingConfigurationData || {},
        config,
      );
      if (existingProposal) {
        const [updatedProposal] = await tx
          .update(proposals)
          .set({
            userId: customer.id,
            systemSizeKwp: payload.system_size_kw,
            panelCount,
            totalPrice: payload.grand_total,
            pdfUrl: payload.pdf_url,
            revisedPdfUrl: payload.pdf_url,
            configurationData,
          })
          .where(eq(proposals.id, existingProposal.id))
          .returning();
        if (!updatedProposal) throw new Error("The ERPNext quotation proposal could not be updated.");
        return { proposal: updatedProposal, preservedPublishedProposal: false };
      }

      const [createdProposal] = await tx
        .insert(proposals)
        .values({
          id: generatedProposalId,
          userId: customer.id,
          systemSizeKwp: payload.system_size_kw,
          panelCount,
          totalPrice: payload.grand_total,
          monthlySavings: 0,
          paybackPeriod: "Pending consultant confirmation",
          pdfUrl: payload.pdf_url,
          revisedPdfUrl: payload.pdf_url,
          status: "DRAFT",
          dispatchStatus: "PENDING_DISPATCH",
          configurationData,
          erpnextQuotationId: payload.quotation_id,
          fulfillmentType: "INSTALLATION",
        })
        .returning();
      if (!createdProposal) throw new Error("The ERPNext quotation proposal could not be created.");
      return { proposal: createdProposal, preservedPublishedProposal: false };
    });
    const proposal = syncResult.proposal;

    const proposalUrl = `${getBaseUrl(request)}/th/proposals/${proposal.id}`;

    return NextResponse.json(
      {
        success: true,
        message: syncResult.preservedPublishedProposal
          ? "The published quotation was preserved. Create and send a new revision to publish ERPNext changes."
          : "ERPNext quotation synced. A final PDF upload is required before customer signing can be enabled.",
        quotation_id: payload.quotation_id,
        proposalId: proposal.id,
        status: proposal.status,
        proposalUrl,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[API /quotations/erpnext-sync] failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ERPNext quotation sync failed",
      },
      { status: 500 },
    );
  }
}
