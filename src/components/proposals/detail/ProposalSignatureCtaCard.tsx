"use client";

import { ArrowRight, FileEdit, LockKeyhole, ShieldCheck } from "@/components/ui/icons";
import { useTranslations } from "next-intl";

interface ProposalSignatureCtaCardProps {
  isSigned: boolean;
  signatureLocked: boolean;
  revisionRequested: boolean;
  isSignableStatus?: boolean;
  notSignableReason?: "AWAITING_STAFF" | "INVALID_STATUS" | null;
  hasReviewedDocument: boolean;
  onOpenSignModal: () => void;
}

export function ProposalSignatureCtaCard({
  isSigned,
  signatureLocked,
  revisionRequested,
  isSignableStatus = true,
  notSignableReason = null,
  hasReviewedDocument,
  onOpenSignModal,
}: ProposalSignatureCtaCardProps) {
  const t = useTranslations("ProposalSignatureCta");
  const reviewRequired = !isSigned && !hasReviewedDocument;
  const isBlocked = !isSigned && (!isSignableStatus || signatureLocked || reviewRequired);

  return (
    <section className="solar-route-card bg-[var(--sd-raised)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--sd-radius-md)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)] shadow-[var(--sd-shadow-1)]">
            {isSigned ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : isBlocked ? (
              <LockKeyhole className="h-5 w-5 text-[#4E4B44]" />
            ) : (
              <FileEdit className="h-5 w-5 text-[#4F7FA8]" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--sd-ink)]">
                {isSigned
                  ? t("signedTitle")
                  : reviewRequired
                    ? t("reviewRequiredTitle")
                  : !isSignableStatus
                    ? notSignableReason === "AWAITING_STAFF"
                      ? t("awaitingStaffTitle")
                      : t("notReadyTitle")
                    : signatureLocked
                      ? t("lockedTitle")
                      : t("readyTitle")}
              </h2>
              {isSigned && (
                <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-0.5 text-[11px] font-bold text-emerald-800">
                  {t("completed")}
                </span>
              )}
            </div>

            <p className="max-w-2xl text-sm font-medium leading-6 text-[var(--sd-muted)]">
              {isSigned
                ? t("signedDescription")
                : reviewRequired
                  ? t("reviewRequiredDescription")
                : !isSignableStatus
                  ? notSignableReason === "AWAITING_STAFF"
                    ? t("awaitingStaffDescription")
                    : t("notReadyDescription")
                  : signatureLocked
                    ? revisionRequested
                      ? t("revisionDescription")
                      : t("lockedDescription")
                    : t("readyDescription")}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {!isSigned && isSignableStatus && !signatureLocked && (
            <button
              type="button"
              onClick={onOpenSignModal}
              disabled={reviewRequired}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sd-radius-md)] bg-[var(--sd-blue-600)] px-8 py-3 text-sm font-bold text-white shadow-[var(--sd-shadow-1)] transition-all hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[var(--sd-soft-solar)] disabled:text-[var(--sd-muted)] disabled:shadow-none sm:w-auto"
            >
              <span>{reviewRequired ? t("reviewRequiredAction") : t("signDocument")}</span>
              <ArrowRight className="h-4 w-4 text-white" />
            </button>
          )}

          {!isSigned && (!isSignableStatus || signatureLocked) && (
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-8 py-3 text-sm font-bold text-[var(--sd-muted)] sm:w-auto"
            >
              <LockKeyhole className="h-4 w-4" />
              <span>{signatureLocked ? t("lockedAction") : t("notReadyAction")}</span>
            </button>
          )}

          {isSigned && (
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 w-full cursor-default items-center justify-center gap-2 rounded-[var(--sd-radius-md)] border border-emerald-300 bg-emerald-50 px-8 py-3 text-xs font-bold text-emerald-800 sm:w-auto"
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {t("documentSigned")}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
