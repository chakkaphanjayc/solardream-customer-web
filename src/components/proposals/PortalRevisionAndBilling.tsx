"use client";

import { useRef, useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CreditCard,
  ExternalLink,
  FileText,
  PencilLine,
  UploadCloud,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { formatPrice } from "@/lib/utils";
import { GsapSpinner } from "@/components/ui/GsapMotion";
import { buildPromptPayPayload, getConfiguredPromptPayId } from "@/lib/promptpay";
import StatusBadge, { type StatusBadgeTone } from "@/components/ui/StatusBadge";
import PaymentInvoiceModal from "@/components/payments/PaymentInvoiceModal";
import PaymentReceiptModal from "@/components/payments/PaymentReceiptModal";
import PaymentMilestoneProgress from "@/components/payments/PaymentMilestoneProgress";
import type {
  ClientPaymentRequest,
  ClientPaymentInstructions,
  ClientProposal,
} from "@/types/proposals";
import { readJsonResponse } from "@/lib/readJsonResponse";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PortalRevisionAndBillingProps = {
  proposal: ClientProposal;
  magicTokenSlug?: string | null;
  initialPaymentRequests: ClientPaymentRequest[];
  paymentInstructions?: ClientPaymentInstructions;
  onRevisionRequested: (status: string, dispatchStatus?: string | null, updatedAt?: string) => void;
  onPaymentRequestsChange?: (requests: ClientPaymentRequest[]) => void;
  section?: "all" | "revision" | "billing";
};

type RevisionResponse = {
  success: boolean;
  error?: string;
  proposal?: {
    status: string;
    dispatchStatus?: string | null;
    updatedAt?: string;
  };
};

type SlipUploadResponse = {
  success: boolean;
  error?: string;
  paymentRequest?: ClientPaymentRequest;
};

function toPositiveNumber(value: string | number | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getPaymentStatusLabel(
  status: ClientPaymentRequest["status"],
  t: (key: string) => string,
) {
  if (status === "AWAITING_VERIFICATION") return t("verification.awaiting");
  if (status === "PAID") return t("verification.paid");
  if (status === "FAILED") return t("verification.failed");
  return t("verification.unpaid");
}

function getVerificationLabel(request: ClientPaymentRequest, t: (key: string) => string) {
  if (request.status === "PAID") return t("verification.paid");
  if (request.status === "AWAITING_VERIFICATION") return t("verification.awaiting");
  if (request.status === "FAILED") return t("verification.failed");
  return t("verification.unpaid");
}

function getStorageLabel(provider: string | null | undefined, t: (key: string) => string) {
  if (provider === "GOOGLE_DRIVE") return t("storage.drive");
  if (provider === "SUPABASE_STORAGE") return t("storage.supabase");
  return null;
}

function getPaymentStatusTone(status: ClientPaymentRequest["status"]): StatusBadgeTone {
  if (status === "PAID") return "success";
  if (status === "AWAITING_VERIFICATION") return "info";
  if (status === "FAILED") return "danger";
  return "warning";
}

export function PortalRevisionAndBilling({
  proposal,
  magicTokenSlug,
  initialPaymentRequests,
  paymentInstructions,
  onRevisionRequested,
  onPaymentRequestsChange,
  section = "all",
}: PortalRevisionAndBillingProps) {
  const t = useTranslations("PortalRevisionAndBilling");
  const [isRevisionOpen, setRevisionOpen] = useState(false);
  const [revisionMessage, setRevisionMessage] = useState("");
  const [activePaymentRequest, setActivePaymentRequest] = useState<ClientPaymentRequest | null>(null);
  const [invoiceModalPr, setInvoiceModalPr] = useState<ClientPaymentRequest | null>(null);
  const [receiptModalPr, setReceiptModalPr] = useState<ClientPaymentRequest | null>(null);
  const [paymentRequests, setPaymentRequests] = useState(initialPaymentRequests);
  const [isPending, startTransition] = useTransition();
  const slipInputRef = useRef<HTMLInputElement | null>(null);
  const promptpayId = getConfiguredPromptPayId();

  const activeUnpaidPaymentRequests = paymentRequests.filter((request) => request.status === "PENDING");
  const activePaymentAmount = activePaymentRequest
    ? toPositiveNumber(activePaymentRequest.amountRequested)
    : null;
  const qrPayload = activePaymentRequest
    ? activePaymentAmount !== null
      ? buildPromptPayPayload(activePaymentAmount)
      : null
    : null;
  const isBankTransfer = activePaymentRequest?.paymentMethod === "BANK_TRANSFER";
  const canUploadProof = isBankTransfer
    ? Boolean(paymentInstructions?.bankAccountNumber)
    : Boolean(qrPayload);

  const submitRevision = () => {
    const message = revisionMessage.trim();
    if (message.length < 3) {
      toast.error(t("revision.validation"));
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/proposals/portal-revision-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proposalId: proposal.id,
            magicTokenSlug: magicTokenSlug || undefined,
            message,
          }),
        });
        const payload = await readJsonResponse<RevisionResponse>(response);
        if (!response.ok || !payload?.success || !payload.proposal) {
          throw new Error(payload?.error || t("revision.submitFailed"));
        }

        onRevisionRequested(
          payload.proposal.status,
          payload.proposal.dispatchStatus,
          payload.proposal.updatedAt,
        );
        setRevisionOpen(false);
        setRevisionMessage("");
        toast.success(t("revision.success"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("revision.failed"));
      }
    });
  };

  const uploadSlip = (file: File) => {
    if (!activePaymentRequest) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("proposal_id", proposal.id);
      formData.set("payment_request_id", activePaymentRequest.id);
      if (magicTokenSlug) formData.set("magic_token_slug", magicTokenSlug);
      formData.set("file", file);

      try {
        const response = await fetch("/api/proposals/portal-payment-slip", {
          method: "POST",
          body: formData,
        });
        const payload = await readJsonResponse<SlipUploadResponse>(response);
        if (!response.ok || !payload?.success || !payload.paymentRequest) {
          throw new Error(payload?.error || t("billing.uploadFailed"));
        }

        setPaymentRequests((current) => {
          const next = current.map((request) => (
            request.id === payload.paymentRequest?.id ? payload.paymentRequest : request
          ));
          onPaymentRequestsChange?.(next);
          return next;
        });
        setActivePaymentRequest(null);
        toast.success(t("billing.uploadSuccess"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("billing.uploadFailed"));
      } finally {
        if (slipInputRef.current) slipInputRef.current.value = "";
      }
    });
  };

  return (
    <section className="space-y-6">
      {section !== "billing" ? (
        <div className="solar-route-card bg-[var(--sd-raised)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sd-blue-600)]">
                {t("revision.eyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[var(--sd-ink)] sm:text-2xl">
                {t("revision.title")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--sd-muted)]">
                {t("revision.description")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRevisionOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-5 py-2.5 text-xs font-bold text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)] transition hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98]"
            >
              <PencilLine className="h-4 w-4 text-[var(--sd-blue-600)]" />
              {t("revision.requestAction")}
            </button>
          </div>
        </div>
      ) : null}

      {section !== "revision" ? (
        <div className="solar-route-card bg-[var(--sd-raised)] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sd-blue-600)]">
                {t("billing.eyebrow")}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.02em] text-[var(--sd-ink)] sm:text-2xl">
                {t("billing.title")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--sd-muted)]">
                {t("billing.description")}
              </p>
            </div>
            <StatusBadge tone={activeUnpaidPaymentRequests.length > 0 ? "warning" : "success"} className="py-2 text-xs">
              {t("billing.activeUnpaid", { count: activeUnpaidPaymentRequests.length })}
            </StatusBadge>
          </div>

          {/* Milestone Schedule Component */}
          <div className="mt-5">
            <PaymentMilestoneProgress
              totalProjectPrice={proposal.totalPrice > 0 ? proposal.totalPrice : null}
              paymentRequests={paymentRequests}
              onSelectMilestone={(req) => {
                if (req.status === "PAID") setReceiptModalPr(req);
                else setInvoiceModalPr(req);
              }}
            />
          </div>

          <div className="mt-6 space-y-4">
            {paymentRequests.length > 0 ? paymentRequests.map((request) => (
              <div key={request.id} className="rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-4 shadow-[var(--sd-shadow-1)] sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--sd-radius-md)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)]">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--sd-ink)]">{request.title}</p>
                      <p className="mt-1 text-xs font-medium text-[var(--sd-muted)]">{t("billing.paymentRequest")}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <StatusBadge tone={getPaymentStatusTone(request.status)} className="text-xs">
                      {getPaymentStatusLabel(request.status, t)}
                    </StatusBadge>
                    <span className="text-sm font-bold text-[var(--sd-ink)]">
                      {(() => {
                        const amount = toPositiveNumber(request.amountRequested);
                        return amount === null ? t("billing.amountPending") : formatPrice(amount);
                      })()}
                    </span>

                    <button
                      type="button"
                      onClick={() => setInvoiceModalPr(request)}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-4 py-2 text-xs font-bold text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)] transition hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2"
                    >
                      <FileText className="h-3.5 w-3.5 text-[var(--sd-blue-600)]" />
                      <span>{t("billing.invoice")}</span>
                    </button>

                    {request.status === "PAID" && (
                      <button
                        type="button"
                        onClick={() => setReceiptModalPr(request)}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--sd-radius-md)] bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-900 shadow-[var(--sd-shadow-1)] transition hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                      >
                        <FileText className="h-3.5 w-3.5 text-emerald-700" />
                        <span>{t("billing.receipt")}</span>
                      </button>
                    )}

                    {request.status === "PENDING" || request.status === "FAILED" ? (
                      <button
                        type="button"
                        onClick={() => setActivePaymentRequest(request)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--sd-radius-md)] bg-[var(--sd-blue-600)] px-5 py-2.5 text-xs font-bold text-white shadow-[var(--sd-shadow-1)] transition hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98]"
                      >
                        <CreditCard className="h-4 w-4" />
                        {t("billing.payNowUploadSlip")}
                      </button>
                    ) : request.slipUrl ? (
                      <a
                        href={request.slipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-4 py-2 text-xs font-bold text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)] transition hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2"
                      >
                        {t("billing.openProof")}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
                {request.slipUrl || request.verificationError ? (
                  <div className="mt-3 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4 text-xs font-medium leading-5 text-[var(--sd-muted)] shadow-[var(--sd-shadow-1)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={getPaymentStatusTone(request.status)}>
                        {getVerificationLabel(request, t)}
                      </StatusBadge>
                      {getStorageLabel(request.storageProvider, t) ? (
                        <StatusBadge tone="neutral">
                          {getStorageLabel(request.storageProvider, t)}
                        </StatusBadge>
                      ) : null}
                    </div>
                    {request.verificationError && request.status !== "PAID" ? (
                      <p className="mt-2 text-amber-700">
                        {t("billing.note", { detail: request.verificationError })}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )) : (
              <div className="rounded-[var(--sd-radius-lg)] border border-dashed border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-5 text-sm font-medium leading-7 text-[var(--sd-muted)]">
                {t("billing.empty")}
              </div>
            )}
          </div>

        </div>
      ) : null}

      <Dialog
        isOpen={isRevisionOpen}
        onClose={() => setRevisionOpen(false)}
        size="md"
        tone="light"
        ariaLabel={t("billing.revisionDialogAria")}
        closeLabel={t("billing.revisionDialogClose")}
        className="max-w-lg overflow-hidden rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] shadow-[var(--sd-shadow-3)]"
      >
        <DialogContent>
          <DialogHeader className="border-b border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-6 py-4">
            <DialogTitle className="text-base font-bold text-[var(--sd-ink)]">{t("billing.revisionDialogTitle")}</DialogTitle>
            <DialogDescription className="text-xs text-[var(--sd-muted)]">
              {t("billing.revisionDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="bg-[var(--sd-page)] p-6">
            <label htmlFor="portal-revision-message" className="sr-only">
              {t("billing.revisionMessageLabel")}
            </label>
            <textarea
              id="portal-revision-message"
              value={revisionMessage}
              onChange={(event) => setRevisionMessage(event.target.value)}
              rows={6}
              className="w-full resize-none rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4 text-sm font-semibold leading-relaxed text-[var(--sd-ink)] outline-none transition-colors placeholder:text-[var(--sd-muted)] focus:border-[var(--sd-blue-600)] focus:ring-2 focus:ring-[var(--sd-blue-600)]/20"
              placeholder={t("billing.revisionMessagePlaceholder")}
            />
          </DialogBody>
          <DialogFooter className="border-t border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-4">
            <button
              type="button"
              onClick={submitRevision}
              disabled={isPending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sd-radius-md)] bg-[var(--sd-blue-600)] px-5 py-3 text-sm font-bold text-white shadow-[var(--sd-shadow-1)] transition-all hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? <GsapSpinner className="h-4 w-4 text-white" /> : <PencilLine className="h-4 w-4" />}
              {t("billing.revisionSubmit")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {activePaymentRequest ? (
        <Dialog
          isOpen
          onClose={() => setActivePaymentRequest(null)}
          size="md"
          tone="light"
          ariaLabel={t("billing.paymentDialogAria")}
          closeLabel={t("billing.revisionDialogClose")}
          className="max-w-lg overflow-hidden rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] shadow-[var(--sd-shadow-3)]"
        >
          <DialogContent>
            <DialogHeader className="border-b border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-6 py-4">
              <DialogTitle className="text-base font-bold text-[var(--sd-ink)]">{t("billing.paymentDialogTitle")}</DialogTitle>
              <DialogDescription className="text-xs text-[var(--sd-muted)]">
                {isBankTransfer
                  ? t("billing.bankTransferDescription")
                  : t("billing.promptPayDescription")}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="bg-[var(--sd-page)] p-6">
              <div className="rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-5 text-center shadow-[var(--sd-shadow-1)]">
                {isBankTransfer ? (
                  paymentInstructions?.bankAccountNumber ? (
                    <div className="rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-5 text-left shadow-[var(--sd-shadow-1)]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sd-blue-600)]">{t("billing.directBankTransfer")}</p>
                      <p className="mt-3 text-sm font-bold text-[var(--sd-ink)]">{paymentInstructions.bankName}</p>
                      <p className="mt-1 text-sm font-medium text-[var(--sd-muted)]">{paymentInstructions.bankAccountName}</p>
                      <p className="mt-3 break-all font-mono text-2xl font-black tracking-wide text-[var(--sd-ink)]">{paymentInstructions.bankAccountNumber}</p>
                    </div>
                  ) : (
                    <div className="mx-auto rounded-[var(--sd-radius-md)] border border-amber-200 bg-amber-50 p-5 text-sm font-medium leading-6 text-amber-800">
                      {t("billing.bankNotConfigured")}
                    </div>
                  )
                ) : qrPayload ? (
                  <div className="mx-auto grid w-fit place-items-center rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4 shadow-[var(--sd-shadow-1)]">
                    <QRCodeSVG value={qrPayload} size={180} includeMargin className="rounded-xl bg-white p-2" />
                  </div>
                ) : (
                  <div className="mx-auto rounded-[var(--sd-radius-md)] border border-amber-200 bg-amber-50 p-5 text-sm font-medium leading-6 text-amber-800">
                    {t("billing.promptPayNotConfigured")}
                  </div>
                )}
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--sd-muted)]">{t("billing.amount")}</p>
                <p className="mt-1 text-3xl font-black tracking-[-0.03em] text-[var(--sd-ink)]">
                  {activePaymentAmount === null ? t("billing.amountPending") : formatPrice(activePaymentAmount)}
                </p>
                <p className="mt-2 text-xs font-medium text-[var(--sd-muted)]">
                  {isBankTransfer
                    ? t("billing.transferInstruction")
                    : t("billing.promptPayId", { id: promptpayId || t("billing.promptPayNotConfiguredShort") })}
                </p>
              </div>
              <input
                ref={slipInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) uploadSlip(file);
                }}
              />
            </DialogBody>
            <DialogFooter className="block border-t border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-4">
              <button
                type="button"
                onClick={() => slipInputRef.current?.click()}
                disabled={isPending || !canUploadProof}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sd-radius-md)] bg-[var(--sd-blue-600)] px-5 py-3 text-sm font-bold text-white shadow-[var(--sd-shadow-1)] transition-all hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50"
              >
                {isPending ? <GsapSpinner className="h-4 w-4 text-white" /> : <UploadCloud className="h-4 w-4" />}
                {t("billing.uploadProof")}
              </button>
              <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-medium text-[var(--sd-muted)]">
                <FileText className="h-3.5 w-3.5 text-[var(--sd-blue-600)]" />
                {t("billing.fileSupport")}
              </p>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      <PaymentInvoiceModal
        isOpen={Boolean(invoiceModalPr)}
        onClose={() => setInvoiceModalPr(null)}
        paymentRequest={invoiceModalPr}
        customerInfo={{
          name: proposal.user?.fullName || proposal.user?.name || t("clientFallback"),
          email: proposal.user?.email,
          phone: proposal.user?.phoneNumber,
          proposalCode: proposal.erpnextQuotationId || proposal.id.slice(0, 8).toUpperCase(),
          systemKwp: proposal.systemSizeKwp,
        }}
        onUploadSlip={(prId, file) => {
          const targetPr = paymentRequests.find((p) => p.id === prId);
          if (targetPr) {
            setActivePaymentRequest(targetPr);
            uploadSlip(file);
          }
        }}
        isUploading={isPending}
      />

      <PaymentReceiptModal
        isOpen={Boolean(receiptModalPr)}
        onClose={() => setReceiptModalPr(null)}
        paymentRequest={receiptModalPr}
        customerInfo={{
          name: proposal.user?.fullName || proposal.user?.name || t("clientFallback"),
          email: proposal.user?.email,
          phone: proposal.user?.phoneNumber,
          proposalCode: proposal.erpnextQuotationId || proposal.id.slice(0, 8).toUpperCase(),
          systemKwp: proposal.systemSizeKwp,
        }}
      />
    </section>
  );
}
