import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  quotationAcceptances,
  proposalRevisions,
  proposals,
  quotationReadModels,
} from "@/db/schema";
import type {
  ProposalQuotationLineItemDto,
  ProposalQuotationPaymentTermDto,
  ProposalQuotationReadModelDto,
  ProposalQuotationTaxDto,
} from "@/types/proposals";
import { quotationRevisionLockKey } from "@/server/services/sales/domain/quotation-revision-state";

type ERPNextDocument = Record<string, unknown>;

const CUSTOMER_VISIBLE_QUOTATION_STATUSES = [
  "OPEN",
  "SUBMITTED",
  "ORDERED",
  "ACCEPTED",
  "COMPLETED",
  "DELIVERED",
] as const;

type NormalizedQuotation = Omit<
  ProposalQuotationReadModelDto,
  "contentHash" | "publishedAt" | "updatedAt"
>;

function asRecord(value: unknown): ERPNextDocument {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as ERPNextDocument)
    : {};
}

function text(value: unknown, maxLength = 500): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).trim().slice(0, maxLength);
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: unknown, fallback = 0): string {
  return number(value, fallback).toFixed(2);
}

function nullableMoney(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return money(value);
}

function dateText(value: unknown): string | null {
  const valueText = text(value, 80);
  return valueText || null;
}

function normalizeItems(document: ERPNextDocument): ProposalQuotationLineItemDto[] {
  const rawItems = Array.isArray(document.items) ? document.items : [];
  return rawItems.slice(0, 200).map((rawItem, index) => {
    const item = asRecord(rawItem);
    const quantity = number(item.qty ?? item.quantity, 1);
    const unitPrice = number(item.rate ?? item.unit_price, 0);
    return {
      itemCode: text(item.item_code ?? item.itemCode, 160) || null,
      name: text(item.item_name ?? item.name ?? item.item_code, 240) || `Item ${index + 1}`,
      description: text(item.description, 2_000) || null,
      quantity: quantity > 0 ? quantity : 0,
      unit: text(item.uom ?? item.stock_uom, 80) || null,
      unitPrice: money(item.rate ?? item.unit_price, unitPrice),
      amount: money(item.amount, unitPrice * quantity),
    };
  });
}

function normalizeTaxes(document: ERPNextDocument): ProposalQuotationTaxDto[] {
  const rawTaxes = Array.isArray(document.taxes) ? document.taxes : [];
  return rawTaxes.slice(0, 100).map((rawTax) => {
    const tax = asRecord(rawTax);
    return {
      label:
        text(tax.description ?? tax.account_head ?? tax.title, 240) ||
        "Tax",
      chargeType: text(tax.charge_type, 120) || null,
      rate: nullableMoney(tax.rate),
      amount: money(tax.tax_amount ?? tax.amount),
    };
  });
}

function normalizePaymentTerms(document: ERPNextDocument): ProposalQuotationPaymentTermDto[] {
  const rawSchedule = Array.isArray(document.payment_schedule)
    ? document.payment_schedule
    : [];
  if (rawSchedule.length > 0) {
    return rawSchedule.slice(0, 50).map((rawTerm, index) => {
      const term = asRecord(rawTerm);
      return {
        label: text(term.description ?? term.payment_term, 240) || `Payment ${index + 1}`,
        dueDate: dateText(term.due_date),
        percentage: nullableMoney(term.invoice_portion),
        amount: nullableMoney(term.payment_amount),
      };
    });
  }

  const paymentTerms = text(document.payment_terms_template ?? document.payment_terms, 240);
  return paymentTerms
    ? [{ label: paymentTerms, dueDate: null, percentage: null, amount: null }]
    : [];
}

function normalizeStatus(document: ERPNextDocument): string {
  const docstatus = number(document.docstatus, 0);
  if (docstatus === 2) return "CANCELLED";
  const providerStatus = text(document.status, 80).toUpperCase();
  if (providerStatus) return providerStatus;
  return docstatus === 1 ? "SUBMITTED" : "DRAFT";
}

export function isCustomerVisibleQuotationStatus(status: string): boolean {
  return (CUSTOMER_VISIBLE_QUOTATION_STATUSES as readonly string[]).includes(
    status.trim().toUpperCase(),
  );
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])]),
  );
}

function contentHash(value: NormalizedQuotation): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function hasSameCommercialSnapshot(
  existing: typeof quotationReadModels.$inferSelect,
  incoming: NormalizedQuotation,
): boolean {
  return existing.customerName === incoming.customerName
    && existing.currency === incoming.currency
    && existing.quotationDate === incoming.quotationDate
    && existing.validUntil === incoming.validUntil
    && existing.subtotal === incoming.subtotal
    && existing.discountAmount === incoming.discountAmount
    && existing.taxAmount === incoming.taxAmount
    && existing.grandTotal === incoming.grandTotal
    && existing.terms === incoming.terms
    && JSON.stringify(canonicalize(existing.itemsSnapshot)) === JSON.stringify(canonicalize(incoming.items))
    && JSON.stringify(canonicalize(existing.taxesSnapshot)) === JSON.stringify(canonicalize(incoming.taxes))
    && JSON.stringify(canonicalize(existing.paymentTermsSnapshot)) === JSON.stringify(canonicalize(incoming.paymentTerms));
}

export function normalizeERPNextQuotation(input: {
  proposalId: string;
  revisionId?: string | null;
  revisionNumber: number;
  erpnextQuotationId: string;
  document: ERPNextDocument;
}): NormalizedQuotation & { contentHash: string } {
  const document = input.document;
  const items = normalizeItems(document);
  const taxes = normalizeTaxes(document);
  const normalized: NormalizedQuotation = {
    proposalId: input.proposalId,
    revisionId: input.revisionId || null,
    revisionNumber: input.revisionNumber,
    erpnextQuotationId: input.erpnextQuotationId,
    status: normalizeStatus(document),
    customerName: text(document.customer_name ?? document.customer, 240) || null,
    currency: text(document.currency, 16) || "THB",
    quotationDate: dateText(document.transaction_date ?? document.quotation_date),
    validUntil: dateText(document.valid_till ?? document.valid_until),
    subtotal: money(document.net_total ?? document.subtotal),
    discountAmount: money(document.discount_amount ?? document.discount_amount_after_discount),
    taxAmount: money(document.total_taxes_and_charges ?? document.tax_amount),
    grandTotal: money(document.grand_total ?? document.total),
    items,
    taxes,
    paymentTerms: normalizePaymentTerms(document),
    terms: text(document.terms_and_conditions ?? document.terms, 8_000) || null,
    providerModifiedAt: dateText(document.modified),
  };
  return { ...normalized, contentHash: contentHash(normalized) };
}

function isMissingRelationError(error: unknown): boolean {
  const record = asRecord(error);
  const cause = asRecord(record.cause);
  return record.code === "42P01" || cause.code === "42P01";
}

function toDto(row: typeof quotationReadModels.$inferSelect): ProposalQuotationReadModelDto | null {
  if (!row.publishedAt || !isCustomerVisibleQuotationStatus(row.status)) return null;
  return {
    proposalId: row.proposalId,
    revisionId: row.revisionId,
    revisionNumber: row.revisionNumber,
    erpnextQuotationId: row.erpnextQuotationId,
    status: row.status,
    customerName: row.customerName,
    currency: row.currency,
    quotationDate: row.quotationDate,
    validUntil: row.validUntil,
    subtotal: row.subtotal,
    discountAmount: row.discountAmount,
    taxAmount: row.taxAmount,
    grandTotal: row.grandTotal,
    items: row.itemsSnapshot,
    taxes: row.taxesSnapshot,
    paymentTerms: row.paymentTermsSnapshot,
    terms: row.terms,
    contentHash: row.contentHash,
    providerModifiedAt: row.providerModifiedAt,
    publishedAt: row.publishedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertQuotationReadModelFromERPNext(input: {
  proposalId: string;
  erpnextQuotationId: string;
  document: ERPNextDocument;
  revisionNumber?: number;
  publishedAt?: Date;
}) {
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${quotationRevisionLockKey(input.proposalId)}))`,
    );

    const proposal = await tx.query.proposals.findFirst({
      where: eq(proposals.id, input.proposalId),
      columns: { id: true, revisionNumber: true },
    });
    if (!proposal) throw new Error(`Proposal ${input.proposalId} not found for quotation projection.`);

    const [acceptance, acceptedRevision] = await Promise.all([
      tx.query.quotationAcceptances.findFirst({
        where: eq(quotationAcceptances.proposalId, proposal.id),
        columns: { id: true },
      }),
      tx.query.proposalRevisions.findFirst({
        where: and(
          eq(proposalRevisions.proposalId, proposal.id),
          eq(proposalRevisions.status, "ACCEPTED"),
        ),
        columns: { id: true },
      }),
    ]);
    if (acceptance || acceptedRevision) {
      return { row: null, ignored: "ACCEPTED_QUOTATION_IMMUTABLE" as const };
    }

    const revisionNumber = input.revisionNumber ?? proposal.revisionNumber;
    if (revisionNumber !== proposal.revisionNumber) {
      return { row: null, ignored: "STALE_QUOTATION_REVISION" as const };
    }
    const revision = await tx.query.proposalRevisions.findFirst({
      where: and(
        eq(proposalRevisions.proposalId, proposal.id),
        eq(proposalRevisions.revisionNumber, revisionNumber),
      ),
      columns: { id: true, status: true },
    });
    const normalized = normalizeERPNextQuotation({
      proposalId: proposal.id,
      revisionId: revision?.id || null,
      revisionNumber,
      erpnextQuotationId: input.erpnextQuotationId,
      document: input.document,
    });
    const now = new Date();
    const isPublishedRevision = revision
      && ["SENT", "VIEWED", "ACCEPTED"].includes(revision.status);
    const customerVisibleStatus = isCustomerVisibleQuotationStatus(normalized.status);
    const publishedAt = isPublishedRevision && customerVisibleStatus
      ? input.publishedAt ?? now
      : null;
    const existingReadModel = await tx.query.quotationReadModels.findFirst({
      where: and(
        eq(quotationReadModels.proposalId, proposal.id),
        eq(quotationReadModels.revisionNumber, revisionNumber),
      ),
    });
    if (
      isPublishedRevision
      && existingReadModel?.publishedAt
      && (!customerVisibleStatus || !hasSameCommercialSnapshot(existingReadModel, normalized))
    ) {
      return { row: null, ignored: "PUBLISHED_REVISION_IMMUTABLE" as const };
    }

    await tx
      .update(quotationReadModels)
      .set({ supersededAt: now, updatedAt: now })
      .where(
        and(
          eq(quotationReadModels.proposalId, proposal.id),
          ne(quotationReadModels.revisionNumber, revisionNumber),
          isNull(quotationReadModels.supersededAt),
        ),
      );

    const [row] = await tx
      .insert(quotationReadModels)
      .values({
        proposalId: normalized.proposalId,
        revisionId: normalized.revisionId,
        revisionNumber: normalized.revisionNumber,
        erpnextQuotationId: normalized.erpnextQuotationId,
        status: normalized.status,
        customerName: normalized.customerName,
        currency: normalized.currency,
        quotationDate: normalized.quotationDate,
        validUntil: normalized.validUntil,
        subtotal: normalized.subtotal,
        discountAmount: normalized.discountAmount,
        taxAmount: normalized.taxAmount,
        grandTotal: normalized.grandTotal,
        itemsSnapshot: normalized.items,
        taxesSnapshot: normalized.taxes,
        paymentTermsSnapshot: normalized.paymentTerms,
        terms: normalized.terms,
        contentHash: normalized.contentHash,
        providerModifiedAt: normalized.providerModifiedAt,
        publishedAt,
        supersededAt: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [quotationReadModels.proposalId, quotationReadModels.revisionNumber],
        set: {
          revisionId: normalized.revisionId,
          erpnextQuotationId: normalized.erpnextQuotationId,
          status: normalized.status,
          customerName: normalized.customerName,
          currency: normalized.currency,
          quotationDate: normalized.quotationDate,
          validUntil: normalized.validUntil,
          subtotal: normalized.subtotal,
          discountAmount: normalized.discountAmount,
          taxAmount: normalized.taxAmount,
          grandTotal: normalized.grandTotal,
          itemsSnapshot: normalized.items,
          taxesSnapshot: normalized.taxes,
          paymentTermsSnapshot: normalized.paymentTerms,
          terms: normalized.terms,
          contentHash: normalized.contentHash,
          providerModifiedAt: normalized.providerModifiedAt,
          publishedAt,
          supersededAt: null,
          updatedAt: now,
        },
      })
      .returning();

    return { row: row ?? null, ignored: null };
  });

  if (!result.row) return null;
  const customerProjection = toDto(result.row);
  if (!customerProjection && result.ignored === null) return null;
  return customerProjection;
}

export async function getCustomerQuotationReadModel(
  proposalId: string,
  revisionNumber: number,
): Promise<ProposalQuotationReadModelDto | null> {
  try {
    const row = await db.query.quotationReadModels.findFirst({
      where: and(
        eq(quotationReadModels.proposalId, proposalId),
        eq(quotationReadModels.revisionNumber, revisionNumber),
        isNotNull(quotationReadModels.publishedAt),
        inArray(quotationReadModels.status, [...CUSTOMER_VISIBLE_QUOTATION_STATUSES]),
      ),
    });
    return row ? toDto(row) : null;
  } catch (error) {
    if (isMissingRelationError(error)) return null;
    throw error;
  }
}
