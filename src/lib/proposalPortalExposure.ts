import type { ClientProposal } from "@/types/proposals";
import {
  getEffectiveQuotationStatus,
  isQuotationAvailableForSignature,
} from "@/lib/quotationSigningEligibility";

const SIGNED_QUOTATION_STATUSES = new Set([
  "SIGNED",
  "FULLY_SIGNED",
  "CLIENT_SIGNED_PENDING_REVIEW",
  "APPROVED",
  "APPROVED_BY_CUSTOMER",
  "CUSTOMER_APPROVED",
]);
const BLOCKED_QUOTATION_STATUSES = new Set([
  "REVISION_REQUESTED",
  "REVISION_REQUIRED",
  "CANCELLED",
  "REJECTED",
  "EXPIRED",
]);

export function hasPublishedCustomerQuotation(input: {
  status: string | null | undefined;
  dispatchStatus: string | null | undefined;
  hasPublishedReadModel: boolean;
  hasAcceptance: boolean;
}): boolean {
  const effectiveStatus = getEffectiveQuotationStatus(
    input.status,
    input.dispatchStatus,
  );

  if (input.hasAcceptance || SIGNED_QUOTATION_STATUSES.has(effectiveStatus)) {
    return true;
  }
  if (BLOCKED_QUOTATION_STATUSES.has(effectiveStatus)) return false;

  return (
    input.hasPublishedReadModel ||
    isQuotationAvailableForSignature(input)
  );
}

function safeTrackingConfiguration(value: unknown): ClientProposal["configurationData"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const configuration = value as Record<string, unknown>;
  return {
    ...(typeof configuration.trackingRef === "string"
      ? { trackingRef: configuration.trackingRef }
      : {}),
    ...(typeof configuration.trackingId === "string"
      ? { trackingId: configuration.trackingId }
      : {}),
  };
}

/** Remove draft commercial data before it crosses a customer-facing boundary. */
type ProposalCommercialFields = Omit<Pick<
  ClientProposal,
  | "systemSizeKwp"
  | "panelCount"
  | "totalPrice"
  | "monthlySavings"
  | "paybackPeriod"
  | "pdfUrl"
  | "revisedPdfUrl"
  | "signedDocumentDriveUrl"
  | "erpnextQuotationId"
>, never> & {
  configurationData: unknown;
  selectedFinancing?: unknown;
  serviceItems?: unknown;
};

export function redactUnpublishedCustomerProposal<
  T extends ProposalCommercialFields,
>(proposal: T): T & {
  selectedFinancing: null;
  serviceItems: [];
} {
  return {
    ...proposal,
    systemSizeKwp: 0,
    panelCount: 0,
    totalPrice: 0,
    monthlySavings: 0,
    paybackPeriod: "",
    pdfUrl: null,
    revisedPdfUrl: null,
    signedDocumentDriveUrl: null,
    configurationData: safeTrackingConfiguration(proposal.configurationData),
    erpnextQuotationId: null,
    selectedFinancing: null,
    serviceItems: [],
  };
}
