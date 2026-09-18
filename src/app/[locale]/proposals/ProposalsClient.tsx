"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  FileText,
  Upload,
  CreditCard,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  Truck,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Eye,
  Download,
  ShieldCheck,
  Wrench,
  Clock,
  ClipboardList,
  Camera,
  Info,
  PenLine,
  SolarPanel,
  ChevronRight,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/productAnalytics";
import { GsapPulse, GsapSpinner } from "@/components/ui/GsapMotion";
import Skeleton from "@/components/ui/skeleton";
import {
  approveProposalRevision,
  requestProposalCancellation,
} from "@/app/actions/proposals";
import StatusBadge, { type StatusBadgeTone } from "@/components/ui/StatusBadge";
import { getInvoicesForProposal } from "@/app/actions/invoices";
import {
  getPaymentRequestsAction,
  processPaymentRequestSlipAction,
} from "@/app/actions/paymentRequests";
import { QRCodeSVG } from "qrcode.react";
import {
  FULFILLMENT_INSTALLATION,
  FULFILLMENT_PURCHASE_ONLY,
  getCarrierTrackingUrl,
} from "@/lib/fulfillment";
import ProgressiveImage from "@/components/ui/progressive-image";
import DigitalSignaturePad from "@/components/ui/DigitalSignaturePad";
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import TrackingGallery from "@/app/[locale]/my-proposal/[id]/tracking/TrackingGallery";
import { buildPromptPayPayload } from "@/lib/promptpay";
import ProposalDetailView from "@/components/proposals/detail/ProposalDetailView";
import { SolarStatePanel } from "@/components/ui/solar-system";
import type {
  ClientProposal,
  ProposalFieldChecklistStepDto as FieldChecklistStep,
  ProposalInvoiceSummaryDto as InvoiceSummary,
  ProposalListItemDto as Proposal,
  ProposalPaymentRequestSummaryDto as PaymentRequestSummary,
} from "@/types/proposals";

const TRACKING_STEPS = [
  {
    keys: [
      "DRAFT",
      "SENT",
      "PENDING_DISPATCH",
      "AWAITING_STAFF_SIGNATURE",
      "QUOTATION_READY",
      "IN_REVIEW",
      "PENDING_EVALUATION",
    ],
    titleKey: "tracking.steps.preparing.title",
    nextStepKey: "tracking.steps.preparing.nextStep",
    icon: FileText,
  },
  {
    keys: [
      "DISPATCHED",
      "AWAITING_CLIENT_SIGNATURE",
      "PENDING_CUSTOMER_APPROVAL",
      "PENDING_CUSTOMER_SIGNATURE",
      "SIGNED_WAITING_VERIFY",
      "CLIENT_SIGNED_PENDING_REVIEW",
      "ACCEPTED",
    ],
    titleKey: "tracking.steps.received.title",
    nextStepKey: "tracking.steps.received.nextStep",
    icon: ShieldCheck,
  },
  {
    keys: ["SIGNED", "FULLY_SIGNED", "VERIFIED_IN_PROGRESS", "CONFIRMED"],
    titleKey: "tracking.steps.engineering.title",
    nextStepKey: "tracking.steps.engineering.nextStep",
    icon: Wrench,
  },
  {
    keys: ["COMPLETED", "COMPLETE"],
    titleKey: "tracking.steps.completed.title",
    nextStepKey: "tracking.steps.completed.nextStep",
    icon: CheckCircle2,
  },
];

function getStepIndex(status: string) {
  const normalized = status.toUpperCase();
  const index = TRACKING_STEPS.findIndex((step) =>
    step.keys.includes(normalized),
  );
  return index >= 0 ? index : 0;
}

function getEffectiveProposalStatus(
  proposal: Pick<Proposal, "status" | "dispatchStatus">,
) {
  return proposal.dispatchStatus &&
    proposal.dispatchStatus !== "PENDING_DISPATCH"
    ? proposal.dispatchStatus
    : proposal.status;
}

function isServiceProposal(proposal: Pick<Proposal, "requestType">) {
  return proposal.requestType?.toLowerCase() === "service";
}

function serviceItemName(item: Record<string, unknown>) {
  const localized =
    item.name && typeof item.name === "object" && !Array.isArray(item.name)
      ? (item.name as Record<string, unknown>)
      : null;
  return String(
    localized?.th ||
      localized?.en ||
      item.title ||
      item.serviceName ||
      item.name ||
      "บริการ",
  );
}

function serviceSummary(items: Array<Record<string, unknown>> = []) {
  const names = items.map(serviceItemName).filter(Boolean);
  return names.length > 1
    ? `${names[0]} + ${names.length - 1} more`
    : names[0] || "Service request";
}

function isObjectUrl(value: string | null): value is string {
  return Boolean(value?.startsWith("blob:"));
}

function toPositiveAmount(value: number | string | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatDate(
  dateInput: string | Date | null | undefined,
  locale = "th-TH",
) {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(
    locale === "th" || locale === "th-TH" ? "th-TH" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

interface ProposalsClientProps {
  initialProposals: Proposal[];
  userId: string;
}

type ProposalListTab = "active" | "archived";

function formatGoogleDrivePreviewUrl(url: string | null | undefined): string {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const isDriveHost =
      parsed.hostname === "drive.google.com" ||
      parsed.hostname.endsWith(".drive.google.com");

    if (!isDriveHost) {
      return url;
    }

    const fileIdFromPath = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    const fileIdFromQuery = parsed.searchParams.get("id");
    const fileId = fileIdFromPath || fileIdFromQuery;

    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    return url.replace(/\/view(?:\?.*)?$/, "/preview");
  } catch {
    return url.replace(/\/view(?:\?.*)?$/, "/preview");
  }
}

function getSignedProposalDocumentUrl(proposalId: string, download = false) {
  return `/api/proposals/${proposalId}/signed-document${download ? "?download=1" : ""}`;
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

function InstallationMilestoneTracker({ proposal }: { proposal: Proposal }) {
  const t = useTranslations("ProposalsClient");
  const params = useParams<{ locale?: string }>();
  const locale = typeof params.locale === "string" ? params.locale : "en";
  // Extract checklist logs
  const checklist = (proposal.fieldChecklistData || {}) as Record<
    string,
    FieldChecklistStep | undefined
  >;

  // Extract photos
  let surveyPhotos: string[] = [];
  if (proposal.surveyPhotos && Array.isArray(proposal.surveyPhotos)) {
    surveyPhotos = proposal.surveyPhotos as string[];
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("installationTracker.badge")}
        </span>
        <h3 className="text-lg font-semibold text-slate-800">
          {t("installationTracker.title")}
        </h3>
        <p className="text-sm text-slate-500 leading-normal">
          {t("installationTracker.description")}
        </p>
      </div>

      <div className="relative border-l border-slate-100 pl-6 space-y-8 mt-6">
        {/* Step 1: Site Survey */}
        {(() => {
          const stepLog = checklist.step_1;
          const isCompleted =
            !!stepLog ||
            proposal.currentMilestoneStep > 1 ||
            proposal.status.toUpperCase() === "COMPLETED";
          const isActive =
            !isCompleted &&
            proposal.currentMilestoneStep === 1 &&
            (proposal.status === "VERIFIED_IN_PROGRESS" ||
              proposal.status === "CONFIRMED");

          return (
            <div className="relative">
              <div
                className={cn(
                  "absolute -left-[37px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full border bg-white transition-all duration-300",
                  isCompleted &&
                    "border-[#B7D1EA] bg-[#B7D1EA] text-slate-900 shadow-sm",
                  isActive &&
                    "border-2 border-slate-900 text-slate-900 ring-4 ring-[#B7D1EA]/25 scale-105",
                  !isCompleted &&
                    !isActive &&
                    "border-slate-200 bg-slate-50 text-[#64748B]",
                )}
              >
                <Camera className="h-3.5 w-3.5" />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {t("fieldMilestones.step1")}
                  </h4>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      isCompleted &&
                        "border-[#B7D1EA]/30 bg-[#B7D1EA]/10 text-slate-700",
                      isActive &&
                        "border-[#F1D6B8]/40 bg-[#F1D6B8]/10 text-[#c8925f]",
                      !isCompleted &&
                        !isActive &&
                        "border-[#CBD5E1] bg-[#F0EEE9] text-[#475569]",
                    )}
                  >
                    {isCompleted
                      ? t("tracking.state.completed")
                      : isActive
                        ? t("tracking.state.active")
                        : t("tracking.state.pending")}
                  </span>
                </div>

                {(proposal.surveyDate || stepLog?.completedAt) && (
                  <p className="text-[10px] font-bold text-[#64748B]">
                    {t("tracking.loggedOn", {
                      date: formatDate(
                        proposal.surveyDate || stepLog?.completedAt,
                        locale,
                      ),
                    })}
                  </p>
                )}

                {(proposal.surveyNotes || stepLog?.checklist?.notes) && (
                  <div className="rounded-xl bg-slate-50/80 p-4 border border-slate-100/50 text-xs font-semibold text-[#475569] leading-relaxed italic">
                    &ldquo; {proposal.surveyNotes || stepLog?.checklist?.notes}{" "}
                    &rdquo;
                  </div>
                )}

                {surveyPhotos.length > 0 && (
                  <div className="mt-4">
                    <TrackingGallery photos={surveyPhotos} />
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Step 2: Mechanical Framing */}
        {(() => {
          const stepLog = checklist.step_2;
          const isCompleted =
            !!stepLog ||
            proposal.currentMilestoneStep > 2 ||
            proposal.status.toUpperCase() === "COMPLETED";
          const isActive =
            !isCompleted &&
            proposal.currentMilestoneStep === 2 &&
            (proposal.status === "VERIFIED_IN_PROGRESS" ||
              proposal.status === "CONFIRMED");

          return (
            <div className="relative">
              <div
                className={cn(
                  "absolute -left-[37px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full border bg-white transition-all duration-300",
                  isCompleted &&
                    "border-[#B7D1EA] bg-[#B7D1EA] text-slate-900 shadow-sm",
                  isActive &&
                    "border-2 border-slate-900 text-slate-900 ring-4 ring-[#B7D1EA]/25 scale-105",
                  !isCompleted &&
                    !isActive &&
                    "border-slate-200 bg-slate-50 text-[#64748B]",
                )}
              >
                <Wrench className="h-3.5 w-3.5" />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {t("fieldMilestones.step2")}
                  </h4>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      isCompleted &&
                        "border-[#B7D1EA]/30 bg-[#B7D1EA]/10 text-slate-700",
                      isActive &&
                        "border-[#F1D6B8]/40 bg-[#F1D6B8]/10 text-[#c8925f]",
                      !isCompleted &&
                        !isActive &&
                        "border-[#CBD5E1] bg-[#F0EEE9] text-[#475569]",
                    )}
                  >
                    {isCompleted
                      ? t("tracking.state.completed")
                      : isActive
                        ? t("tracking.state.active")
                        : t("tracking.state.pending")}
                  </span>
                </div>

                {stepLog?.completedAt && (
                  <p className="text-[10px] font-bold text-[#64748B]">
                    {t("tracking.loggedOn", {
                      date: formatDate(stepLog.completedAt, locale),
                    })}
                  </p>
                )}

                {stepLog?.checklist?.notes && (
                  <div className="rounded-xl bg-[#F0EEE9] p-4 border-2 border-[#000000] text-xs font-semibold text-[#334155] leading-relaxed italic">
                    &ldquo; {stepLog.checklist.notes} &rdquo;
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Step 3: Electrical & Wiring */}
        {(() => {
          const stepLog = checklist.step_3;
          const isCompleted =
            !!stepLog ||
            proposal.currentMilestoneStep > 3 ||
            proposal.status.toUpperCase() === "COMPLETED";
          const isActive =
            !isCompleted &&
            proposal.currentMilestoneStep === 3 &&
            (proposal.status === "VERIFIED_IN_PROGRESS" ||
              proposal.status === "CONFIRMED");

          return (
            <div className="relative">
              <div
                className={cn(
                  "absolute -left-[37px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full border bg-white transition-all duration-300",
                  isCompleted &&
                    "border-[#B7D1EA] bg-[#B7D1EA] text-slate-900 shadow-sm",
                  isActive &&
                    "border-2 border-slate-900 text-slate-900 ring-4 ring-[#B7D1EA]/25 scale-105",
                  !isCompleted &&
                    !isActive &&
                    "border-slate-200 bg-slate-50 text-[#64748B]",
                )}
              >
                <Info className="h-3.5 w-3.5" />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {t("fieldMilestones.step3")}
                  </h4>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      isCompleted &&
                        "border-[#B7D1EA]/30 bg-[#B7D1EA]/10 text-slate-700",
                      isActive &&
                        "border-[#F1D6B8]/40 bg-[#F1D6B8]/10 text-[#c8925f]",
                      !isCompleted &&
                        !isActive &&
                        "border-[#CBD5E1] bg-[#F0EEE9] text-[#475569]",
                    )}
                  >
                    {isCompleted
                      ? t("tracking.state.completed")
                      : isActive
                        ? t("tracking.state.active")
                        : t("tracking.state.pending")}
                  </span>
                </div>

                {stepLog?.completedAt && (
                  <p className="text-[10px] font-bold text-[#64748B]">
                    {t("tracking.loggedOn", {
                      date: formatDate(stepLog.completedAt, locale),
                    })}
                  </p>
                )}

                {stepLog?.checklist?.notes && (
                  <div className="rounded-xl bg-[#F0EEE9] p-4 border-2 border-[#000000] text-xs font-semibold text-[#334155] leading-relaxed italic">
                    &ldquo; {stepLog.checklist.notes} &rdquo;
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Step 4: Final Handover */}
        {(() => {
          const stepLog = checklist.step_4;
          const isCompleted =
            !!stepLog || proposal.status.toUpperCase() === "COMPLETED";
          const isActive =
            !isCompleted && proposal.status.toUpperCase() === "COMPLETED";

          return (
            <div className="relative">
              <div
                className={cn(
                  "absolute -left-[37px] top-1.5 flex h-7 w-7 items-center justify-center rounded-full border bg-white transition-all duration-300",
                  isCompleted &&
                    "border-[#B7D1EA] bg-[#B7D1EA] text-slate-900 shadow-sm",
                  isActive &&
                    "border-2 border-slate-900 text-slate-900 ring-4 ring-[#B7D1EA]/25 scale-105",
                  !isCompleted &&
                    !isActive &&
                    "border-slate-200 bg-slate-50 text-[#64748B]",
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    {t("fieldMilestones.step4")}
                  </h4>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                      isCompleted &&
                        "border-[#B7D1EA]/30 bg-[#B7D1EA]/10 text-slate-700",
                      isActive &&
                        "border-[#F1D6B8]/40 bg-[#F1D6B8]/10 text-[#c8925f]",
                      !isCompleted &&
                        !isActive &&
                        "border-[#CBD5E1] bg-[#F0EEE9] text-[#475569]",
                    )}
                  >
                    {isCompleted
                      ? t("tracking.state.completed")
                      : isActive
                        ? t("tracking.state.active")
                        : t("tracking.state.pending")}
                  </span>
                </div>

                {stepLog?.completedAt && (
                  <p className="text-[10px] font-bold text-[#64748B]">
                    {t("tracking.loggedOn", {
                      date: formatDate(stepLog.completedAt, locale),
                    })}
                  </p>
                )}

                {stepLog?.checklist?.notes && (
                  <div className="rounded-xl bg-[#F0EEE9] p-4 border-2 border-[#000000] text-xs font-semibold text-[#334155] leading-relaxed italic">
                    &ldquo; {stepLog.checklist.notes} &rdquo;
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function PurchaseLogisticsBoard({ proposal }: { proposal: Proposal }) {
  const t = useTranslations("ProposalsClient");
  const carrier = proposal.configurationData?.shippingCarrier || "";
  const trackingUrl = getCarrierTrackingUrl(
    carrier,
    proposal.shippingTrackingNumber,
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#CBC7BE] bg-[#DCE8F5] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#0E2336]">
          <PackageCheck className="h-3.5 w-3.5" />
          {t("purchaseLogistics.badge")}
        </span>
        <h3 className="text-lg font-semibold text-slate-800">
          {t("purchaseLogistics.title")}
        </h3>
        <p className="text-sm text-slate-500 leading-normal">
          {t("purchaseLogistics.description")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span className="text-[9px] font-black uppercase tracking-wider text-[#64748B]">
            {t("purchaseLogistics.erpQuote")}
          </span>
          <p className="mt-2 font-mono text-xs font-black text-slate-900">
            {proposal.erpnextQuotationId || t("fallback.pending")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span className="text-[9px] font-black uppercase tracking-wider text-[#64748B]">
            {t("purchaseLogistics.carrier")}
          </span>
          <p className="mt-2 text-xs font-black text-slate-900">
            {carrier || t("fallback.pending")}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span className="text-[9px] font-black uppercase tracking-wider text-[#64748B]">
            {t("purchaseLogistics.tracking")}
          </span>
          <p className="mt-2 font-mono text-xs font-black text-slate-900">
            {proposal.shippingTrackingNumber || t("fallback.pending")}
          </p>
        </div>
      </div>
      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-[#B7D1EA] hover:text-[#2C486A]"
        >
          <Truck className="h-4 w-4" />
          {t("purchaseLogistics.trackDelivery")}
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

function ProposalListTabButton({
  active,
  children,
  onClick,
  id,
  controls,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  id: string;
  controls: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      className={`inline-flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-1.5 text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7FA8] focus-visible:ring-offset-2 ${
        active
          ? "border-[#000000] bg-[#B7D1EA] text-[#0F172A] shadow-[2px_2px_0_#000000]"
          : "border-transparent bg-white text-slate-700 hover:border-[#000000] hover:bg-[#F0EEE9] hover:text-[#000000]"
      }`}
    >
      <span className="whitespace-normal break-words text-center leading-5">
        {children}
      </span>
    </button>
  );
}

export default function ProposalsClient({
  initialProposals,
  userId,
}: ProposalsClientProps) {
  const params = useParams<{ locale?: string }>();
  const t = useTranslations("ProposalsClient");
  const activeLocale = useLocale();
  const locale = typeof params.locale === "string" ? params.locale : "en";
  const intlLocale = activeLocale === "th" ? "th-TH" : "en-US";
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(
    initialProposals.length > 0 ? initialProposals[0].id : null,
  );
  const [isUpdatingProposal, setIsUpdatingProposal] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const detailPaneRef = useRef<HTMLElement | null>(null);
  const mobileBackButtonRef = useRef<HTMLButtonElement | null>(null);
  const proposalCardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileListScrollYRef = useRef(0);
  const restoreMobileListRef = useRef(false);

  // High-fidelity document viewport states
  const [scale, setScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const [dragOverMap, setDragOverMap] = useState<Record<string, boolean>>({});
  const [approvingRevisionMap, setApprovingRevisionMap] = useState<
    Record<string, boolean>
  >({});

  // Local file pre-flight preview states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [signatureBase64, setSignatureBase64] = useState<string>("");
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [proposalListTab, setProposalListTab] =
    useState<ProposalListTab>("active");

  // Decision card: open the digital signature modal from Approve button
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [hasAcceptedSignatureTerms, setHasAcceptedSignatureTerms] =
    useState(false);
  const [isDocumentReviewOpen, setIsDocumentReviewOpen] = useState(false);

  const router = useRouter();

  // Payment modal state hooks
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentPreviewUrl, setPaymentPreviewUrl] = useState<string | null>(
    null,
  );
  const [isUploadingPayment, setIsUploadingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentRequests, setPaymentRequests] = useState<
    PaymentRequestSummary[]
  >([]);
  const [paymentDragActive, setPaymentDragActive] = useState(false);

  const formatCurrency = (value: number | null) => {
    if (value === null || !Number.isFinite(value) || value <= 0) {
      return t("labels.pricePending");
    }

    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(value);
  };
  const formatShortDate = (dateInput: string | Date) =>
    new Intl.DateTimeFormat(intlLocale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateInput));
  useEffect(() => {
    return () => {
      if (isObjectUrl(previewUrl)) {
        URL.revokeObjectURL(previewUrl);
      }
      if (isObjectUrl(paymentPreviewUrl)) {
        URL.revokeObjectURL(paymentPreviewUrl);
      }
    };
  }, [previewUrl, paymentPreviewUrl]);

  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  useEffect(() => {
    if (!activeProposalId) {
      return;
    }

    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;
      setInvoicesLoading(true);
      setInvoices([]);
      getInvoicesForProposal(activeProposalId)
        .then((res) => {
          if (isCancelled) return;
          if (res.success && res.invoices) {
            setInvoices(res.invoices);
          } else if (res.error) {
            toast.error(res.error);
          }
          setInvoicesLoading(false);
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Failed to load invoices:", err);
          setInvoicesLoading(false);
        });

      setPaymentRequests([]);
      getPaymentRequestsAction(activeProposalId)
        .then((res) => {
          if (isCancelled) return;
          if (res.success && res.paymentRequests) {
            setPaymentRequests(res.paymentRequests);
          }
        })
        .catch((err) => {
          if (isCancelled) return;
          console.error("Failed to load payment requests:", err);
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [activeProposalId]);

  useEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        if (isDesktop) {
          detailPaneRef.current?.scrollTo({ top: 0, behavior: "auto" });
          return;
        }

        if (mobileDetailOpen) {
          const mobileAnchor = detailPaneRef.current ?? workspaceRef.current;
          const detailTop = mobileAnchor
            ? window.scrollY + mobileAnchor.getBoundingClientRect().top - 136
            : window.scrollY;
          window.scrollTo({ top: Math.max(0, detailTop), behavior: "auto" });
          mobileBackButtonRef.current?.focus({ preventScroll: true });
          return;
        }

        if (restoreMobileListRef.current) {
          restoreMobileListRef.current = false;
          window.scrollTo({
            top: mobileListScrollYRef.current,
            behavior: "auto",
          });
          if (activeProposalId) {
            proposalCardRefs.current[activeProposalId]?.focus({
              preventScroll: true,
            });
          }
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activeProposalId, mobileDetailOpen]);

  const handleSelectProposal = (id: string) => {
    if (id === activeProposalId) return;
    setIsUpdatingProposal(true);
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      mobileListScrollYRef.current = window.scrollY;
      restoreMobileListRef.current = false;
    }
    setActiveProposalId(id);
    setMobileDetailOpen(true);
    handleCancelUpload();
    setScale(1);
    setSignatureBase64("");

    setTimeout(() => {
      setIsUpdatingProposal(false);
    }, 350);
  };

  const handleMobileBack = () => {
    restoreMobileListRef.current = true;
    setMobileDetailOpen(false);
  };

  const activeProposals = useMemo(
    () =>
      proposals.filter(
        (proposal) =>
          getEffectiveProposalStatus(proposal).toUpperCase() !== "CANCELLED" &&
          proposal.isArchived !== true,
      ),
    [proposals],
  );

  const archivedProposals = useMemo(
    () =>
      proposals.filter(
        (proposal) =>
          getEffectiveProposalStatus(proposal).toUpperCase() === "CANCELLED" ||
          proposal.isArchived === true,
      ),
    [proposals],
  );

  const visibleProposals =
    proposalListTab === "active" ? activeProposals : archivedProposals;
  const displayProposals =
    visibleProposals.length > 0 ? visibleProposals : proposals;

  const handleSignProposal = async (proposalId: string) => {
    if (!signatureBase64) {
      toast.error(t("toast.signatureRequired"));
      return false;
    }
    setIsSigning(true);
    try {
      const proposal = proposals.find((item) => item.id === proposalId);
      const response = await fetch("/api/quotations/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotation_id: proposal?.erpnextQuotationId || proposalId,
          signature: signatureBase64,
        }),
      });
      const result = await response.json() as { error?: string; status?: string };
      if (response.ok) {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  status: result.status || "CLIENT_SIGNED_PENDING_REVIEW",
                  signatureUrl: signatureBase64,
                  signedAt: new Date().toISOString(),
                }
              : p,
          ),
        );
        toast.success(t("toast.signSuccess"));
        void trackProductEvent("proposal_signed", {
          signature_method: "digital_pad",
          proposal_status: result.status || "CLIENT_SIGNED_PENDING_REVIEW",
          surface: "proposals_portal",
        });
        return true;
      } else {
        toast.error(result.error || t("toast.signFailed"));
        return false;
      }
    } catch {
      toast.error(t("toast.signTechnicalError"));
      return false;
    } finally {
      setIsSigning(false);
    }
  };

  const handleDocumentReviewComplete = () => {
    setIsDocumentReviewOpen(false);
    setProposals((prev) =>
      prev.map((p) =>
        p.id === activeProposalId
          ? {
              ...p,
              status: "SIGNED",
              signedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
    toast.success(
      activeLocale === "th"
        ? "ลงนามสัญญาเรียบร้อยแล้ว! ข้อมูลของคุณได้รับการอัปเดตแล้ว"
        : "Contract signed successfully! Your status has been updated.",
    );
  };

  const handleRequestCancellation = async () => {
    if (!activeProposalId) return;
    setIsCancelling(true);
    try {
      const res = await requestProposalCancellation(
        activeProposalId,
        cancelReason,
      );
      if (res.success && res.proposal) {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === activeProposalId
              ? {
                  ...p,
                  status: "CANCEL_REQUESTED",
                  isArchived: false,
                  configurationData: res.proposal
                    .configurationData as Proposal["configurationData"],
                }
              : p,
          ),
        );
        toast.success(t("toast.cancelRequestSuccess"));
        void trackProductEvent("proposal_cancellation_requested", {
          proposal_status: "CANCEL_REQUESTED",
          surface: "proposals_portal",
        });
        setIsCancelModalOpen(false);
        setCancelReason("");
      } else {
        toast.error(res.error || t("toast.cancelRequestFailed"));
      }
    } catch {
      toast.error(t("toast.technicalError"));
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePaymentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดรูปภาพสลิปเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น",
        );
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
        return;
      }
      setPaymentFile(file);
      setPaymentPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePaymentFile = () => {
    setPaymentFile(null);
    setPaymentPreviewUrl(null);
  };

  const handlePaymentDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setPaymentDragActive(true);
    } else if (e.type === "dragleave") {
      setPaymentDragActive(false);
    }
  };

  const handlePaymentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPaymentDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error(
          "รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดรูปภาพสลิปเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น",
        );
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
        return;
      }
      setPaymentFile(file);
      setPaymentPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleVerifyPayment = async () => {
    if (!activePR) {
      toast.error("ไม่พบคำขอชำระเงินที่ต้องการชำระ");
      return;
    }
    if (!paymentFile) {
      toast.error("กรุณาอัปโหลดหลักฐานการชำระเงิน (สลิปธนาคาร)");
      return;
    }

    setIsUploadingPayment(true);
    setIsVerifyingPayment(true);

    try {
      const formData = new FormData();
      formData.set("file", paymentFile, paymentFile.name);

      const result = await processPaymentRequestSlipAction(
        activePR.id,
        formData,
      );
      if (!result.success) {
        throw new Error(result.error || "การตรวจสอบสลิปเงินมัดจำล้มเหลว");
      }
      if (result.warning) {
        toast.warning(result.warning, { duration: 8000 });
      }

      toast.success("อัปโหลดและส่งหลักฐานการชำระเงินเรียบร้อยแล้ว");
      void trackProductEvent("proposal_payment_submitted", {
        payment_surface: "proposals_portal",
        payment_type: isDeposit ? "deposit" : "invoice",
      });
      setIsPaymentModalOpen(false);
      handleRemovePaymentFile();

      // Refresh page to load updated database status
      router.refresh();
      if (activeProposalId) {
        getPaymentRequestsAction(activeProposalId).then((res) => {
          if (res.success && res.paymentRequests) {
            setPaymentRequests(res.paymentRequests);
          }
        });
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการตรวจสอบการชำระเงิน",
      );
    } finally {
      setIsUploadingPayment(false);
      setIsVerifyingPayment(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (activeProposal?.status.toUpperCase() === "EXPIRED") {
      toast.error(t("toast.expiredCompatibility"));
      return;
    }

    if (isArchivedProposal) {
      toast.error(t("toast.archivedUploadBlocked"));
      return;
    }

    // 1. Validation
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
    ];
    const hasAllowedType = allowedTypes.includes(file.type);
    const hasAllowedExtension = /\.(pdf|png|jpe?g)$/i.test(file.name);

    if (!hasAllowedType && !hasAllowedExtension) {
      toast.error(t("toast.invalidFileType"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("toast.fileTooLarge"));
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleConfirmUpload = async (proposalId: string) => {
    if (activeProposal?.status.toUpperCase() === "EXPIRED") {
      toast.error(t("toast.expiredCompatibility"));
      return;
    }

    if (isArchivedProposal) {
      toast.error(t("toast.archivedUploadBlocked"));
      return;
    }

    if (!selectedFile) return;

    setUploadingMap((prev) => ({ ...prev, [proposalId]: true }));

    // Create Form Data payload
    const formData = new FormData();
    let fileToSend: File | Blob = selectedFile;
    const fileName = selectedFile.name || "signed_proposal.pdf";

    try {
      // Re-buffer virtual/cloud-backed files into a clean local Blob before upload.
      const arrayBuffer = await selectedFile.arrayBuffer();
      fileToSend = new Blob([arrayBuffer], { type: "application/pdf" });
    } catch (bufferError) {
      console.error("Failed to re-buffer cloud instance file:", bufferError);
      // Fall back to the original file object if ArrayBuffer extraction fails.
      fileToSend = selectedFile;
    }

    formData.set("file", fileToSend, fileName);
    formData.append("proposal_id", proposalId);
    formData.append("user_id", userId);

    try {
      const uploadUrl = new URL(
        "/api/proposals/upload-signed",
        window.location.origin,
      );
      const response = await fetch(uploadUrl, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });

      const responseText = await response.text();
      const result = responseText
        ? (JSON.parse(responseText) as {
            success?: boolean;
            error?: string;
            webViewLink?: string;
          })
        : {};

      if (response.ok && result.success) {
        toast.success(t("toast.uploadSuccess"));

        // Update local state status instantly to SIGNED_WAITING_VERIFY
        setProposals((prev) =>
          prev.map((p) =>
            p.id === proposalId
              ? {
                  ...p,
                  status: "SIGNED_WAITING_VERIFY",
                  signedDocumentDriveUrl:
                    result.webViewLink || p.signedDocumentDriveUrl,
                }
              : p,
          ),
        );

        setSelectedFile(null);
        setPreviewUrl(null);
        void trackProductEvent("proposal_document_uploaded", {
          document_type: "signed_quotation",
          document_version: nextVersion,
          surface: "proposals_portal",
        });
      } else {
        toast.error(result.error || t("toast.uploadFailed"));
      }
    } catch (err) {
      console.error("Signed proposal upload failed:", err);
      if (err instanceof TypeError) {
        toast.error(t("toast.cloudUploadBlocked"));
        return;
      }
      const message =
        err instanceof Error ? err.message : "Unknown upload error";
      toast.error(t("toast.uploadServerError", { message }));
    } finally {
      setUploadingMap((prev) => ({ ...prev, [proposalId]: false }));
    }
  };

  const handleApproveRevision = async (proposalId: string) => {
    setApprovingRevisionMap((prev) => ({ ...prev, [proposalId]: true }));
    const result = await approveProposalRevision(proposalId);
    if (result.success) {
      setProposals((prev) =>
        prev.map((proposal) =>
          proposal.id === proposalId
            ? { ...proposal, status: "SIGNED" }
            : proposal,
        ),
      );
      toast.success(t("toast.revisionApproved"));
      void trackProductEvent("proposal_revision_approved", {
        proposal_status: "SIGNED",
        surface: "proposals_portal",
      });
    } else {
      toast.error(result.error || t("toast.revisionApproveFailed"));
    }
    setApprovingRevisionMap((prev) => ({ ...prev, [proposalId]: false }));
  };

  const handleDragOver = (e: React.DragEvent, proposalId: string) => {
    e.preventDefault();
    setDragOverMap((prev) => ({ ...prev, [proposalId]: true }));
  };

  const handleDragLeave = (proposalId: string) => {
    setDragOverMap((prev) => ({ ...prev, [proposalId]: false }));
  };

  const handleDrop = (e: React.DragEvent, proposalId: string) => {
    e.preventDefault();
    setDragOverMap((prev) => ({ ...prev, [proposalId]: false }));
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Helper to render Status Badges
  const renderStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    const makeBadge = (
      tone: StatusBadgeTone,
      label: React.ReactNode,
      icon?: React.ReactNode,
      extraClassName?: string,
    ) => (
      <StatusBadge
        tone={tone}
        className={cn("text-xs uppercase tracking-[0.08em]", extraClassName)}
      >
        {icon}
        {label}
      </StatusBadge>
    );

    if (s === "PENDING_DISPATCH") {
      return makeBadge(
        "slate",
        "Preparing",
        <Clock className="h-3.5 w-3.5 text-slate-500" />,
      );
    }
    if (s === "AWAITING_STAFF_SIGNATURE") {
      return makeBadge(
        "warning",
        "Staff approval",
        <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />,
      );
    }
    if (s === "AWAITING_CLIENT_SIGNATURE" || s === "DISPATCHED") {
      return makeBadge(
        "info",
        "Ready to sign",
        <PenLine className="h-3.5 w-3.5 text-[#4F7FA8]" />,
      );
    }
    if (s === "CLIENT_SIGNED_PENDING_REVIEW") {
      return makeBadge(
        "info",
        "Signature received",
        <ShieldCheck className="h-3.5 w-3.5 text-sky-700" />,
      );
    }
    if (s === "FULLY_SIGNED") {
      return makeBadge(
        "success",
        "Approved",
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />,
      );
    }
    if (s === "ACTIVE") {
      return makeBadge(
        "success",
        t("status.active"),
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />,
      );
    }
    if (s === "DEACTIVATED") {
      return (
        <Tooltip content={t("status.deactivatedTooltip")}>
          <span
            tabIndex={0}
            className="inline-flex min-h-11 cursor-help items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-950"
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
            <span className="line-through text-rose-950/70">
              {t("status.deactivated")}
            </span>
          </span>
        </Tooltip>
      );
    }
    if (s === "SIGNED_WAITING_VERIFY") {
      return makeBadge(
        "warning",
        t("status.signedPending"),
        <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />,
      );
    }
    if (s === "PENDING_EVALUATION") {
      return makeBadge(
        "warning",
        t("status.pendingEvaluation"),
        <AlertCircle className="h-3.5 w-3.5 text-amber-700" />,
      );
    }
    if (s === "CANCEL_REQUESTED") {
      return makeBadge(
        "danger",
        t("status.cancelRequested"),
        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />,
      );
    }
    if (s === "CONFIRMED") {
      return makeBadge(
        "info",
        t("status.confirmed"),
        <CheckCircle2 className="h-3.5 w-3.5 text-sky-700" />,
      );
    }
    if (s === "EXPIRED") {
      return makeBadge(
        "warning",
        t("status.expired"),
        <AlertCircle className="h-3.5 w-3.5 text-amber-700" />,
      );
    }
    return makeBadge("neutral", t("status.draft"));
  };

  const activeProposal =
    proposals.find((p) => p.id === activeProposalId) || null;
  const activeEffectiveStatus = activeProposal
    ? getEffectiveProposalStatus(activeProposal).toUpperCase()
    : "";
  const isExpired =
    activeProposal && activeProposal.validUntil
      ? new Date() > new Date(activeProposal.validUntil) &&
        !["SIGNED", "FULLY_SIGNED"].includes(activeEffectiveStatus)
      : false;
  const isExpiredProposal = activeProposal
    ? activeEffectiveStatus === "EXPIRED" || isExpired
    : false;
  const isCancelRequested = activeProposal
    ? activeEffectiveStatus === "CANCEL_REQUESTED"
    : false;
  const isCancelledProposal = activeProposal
    ? activeEffectiveStatus === "CANCELLED" ||
      activeProposal.isArchived === true
    : false;
  const isArchivedProposal = activeProposal
    ? activeProposal.isArchived === true ||
      activeEffectiveStatus === "CANCELLED"
    : false;
  const canUploadDocuments =
    Boolean(activeProposal) &&
    !isArchivedProposal &&
    activeEffectiveStatus !== "EXPIRED" &&
    !isExpired;
  const revisedPreviewUrl = formatGoogleDrivePreviewUrl(
    activeProposal?.revisedPdfUrl,
  );
  const signedPreviewUrl =
    activeEffectiveStatus === "SIGNED" && activeProposal?.id
      ? getSignedProposalDocumentUrl(activeProposal.id)
      : formatGoogleDrivePreviewUrl(activeProposal?.signedDocumentDriveUrl);
  const signedDownloadUrl =
    activeEffectiveStatus === "SIGNED" && activeProposal?.id
      ? getSignedProposalDocumentUrl(activeProposal.id, true)
      : signedPreviewUrl;
  const activeUploadedVersions =
    activeProposal?.configurationData?.uploadedVersions ?? [];
  const nextVersion = activeProposal
    ? activeUploadedVersions.length + 1 || 1
    : 1;
  const activeFulfillmentType =
    activeProposal?.fulfillmentType || FULFILLMENT_PURCHASE_ONLY;
  const isPurchaseLogisticsActive = activeProposal
    ? activeFulfillmentType === FULFILLMENT_PURCHASE_ONLY &&
      ["SENT", "ACCEPTED", "COMPLETED"].includes(activeEffectiveStatus)
    : false;

  // True only when admin has sent the quotation awaiting customer decision
  const isPendingCustomerSignature = activeProposal
    ? [
        "PENDING_CUSTOMER_APPROVAL",
        "PENDING_CUSTOMER_SIGNATURE",
        "AWAITING_CLIENT_SIGNATURE",
        "DISPATCHED",
      ].includes(activeEffectiveStatus)
    : false;

  // Find active pending payment request if any
  const activePR = paymentRequests.find((pr) => pr.status === "PENDING");
  const activePRTitle = activePR?.title.toLowerCase() || "";
  const isDeposit =
    activePRTitle.includes("deposit") ||
    activePRTitle.includes("มัดจำ") ||
    activePRTitle.includes("down payment") ||
    activePRTitle.includes("downpayment");
  const activeAmount = activePR
    ? toPositiveAmount(activePR.amountRequested)
    : toPositiveAmount(activeProposal?.totalPrice);
  const promptpayPayload = activeAmount === null ? null : buildPromptPayPayload(activeAmount);

  const handleOpenPaymentModal = () => {
    void trackProductEvent("proposal_payment_started", {
      payment_surface: "proposals_portal",
      payment_type: isDeposit ? "deposit" : "invoice",
    });
    setIsPaymentModalOpen(true);
  };

  useEffect(() => {
    if (!activeProposal) return;
    void trackProductEvent("proposal_request_viewed", {
      proposal_status: activeEffectiveStatus,
      revision_number: activeProposal.revisionNumber,
      request_type: activeProposal.requestType || "installation",
      surface: "proposals_portal",
    });
  }, [
    activeEffectiveStatus,
    activeProposal?.id,
    activeProposal?.requestType,
    activeProposal?.revisionNumber,
    activeProposal,
  ]);

  // BOM details
  const items = activeProposal?.configurationData?.items || [];
  const subtotal = items.reduce((acc: number, item) => {
    const qty = Number(item.quantity || item.qty || 1);
    const price = Number(item.unitPrice || item.price || 0);
    return acc + price * qty;
  }, 0);
  const displaySubtotal =
    subtotal > 0 ? subtotal : activeProposal?.totalPrice || 0;
  const discount =
    displaySubtotal > (activeProposal?.totalPrice || 0)
      ? displaySubtotal - (activeProposal?.totalPrice || 0)
      : 0;
  const grandTotal = activeProposal?.totalPrice || 0;
  const sharedDetailProposal: ClientProposal | null = activeProposal
    ? {
        id: activeProposal.id,
        userId: activeProposal.userId,
        systemSizeKwp: activeProposal.systemSizeKwp,
        panelCount: activeProposal.panelCount,
        totalPrice: activeProposal.totalPrice,
        monthlySavings: activeProposal.monthlySavings,
        paybackPeriod: activeProposal.paybackPeriod,
        pdfUrl: activeProposal.pdfUrl,
        revisedPdfUrl: activeProposal.revisedPdfUrl,
        revisionNumber: activeProposal.revisionNumber ?? 1,
        status: activeProposal.status,
        dispatchStatus: activeProposal.dispatchStatus,
        configurationData: activeProposal.configurationData || {},
        fulfillmentType:
          activeProposal.fulfillmentType || FULFILLMENT_PURCHASE_ONLY,
        erpnextQuotationId: activeProposal.erpnextQuotationId || null,
        selectedFinancing: null,
        user: null,
        createdAt: new Date(activeProposal.createdAt).toISOString(),
        updatedAt: new Date(activeProposal.updatedAt).toISOString(),
        requestType: activeProposal.requestType,
        serviceItems: activeProposal.serviceItems || [],
        preferredDate: activeProposal.preferredDate
          ? new Date(activeProposal.preferredDate).toISOString()
          : null,
      }
    : null;

  return (
    <div
      ref={workspaceRef}
      data-bagui="proposals-workspace"
      data-solar-surface="atelier"
      className="solar-route-page solar-proposals-page sd-safe-pb-26-add min-h-dvh w-full bg-[var(--sd-page)] px-4 pt-6 lg:px-6 lg:pb-24 lg:pt-8"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col">
        <header className="relative mb-6 shrink-0 py-4 sm:py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#4F7FA8]">
                {t("header.eyebrow")}
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-[#000000] sm:text-4xl">
                {t("header.title")}
              </h1>
              <p className="mt-2 max-w-3xl text-xs font-bold leading-6 text-slate-700">
                ติดตามใบเสนอราคา ลายเซ็นดิจิทัล การชำระเงิน
                และความคืบหน้างานติดตั้งได้จากที่เดียว
              </p>
            </div>
            <div className="relative hidden gap-3 lg:flex">
              <Link
                href={`/${locale}/build`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-[3px] border-[#000000] bg-white px-5 py-2.5 text-xs font-black text-[#000000] shadow-[4px_4px_0_#000000] transition-all duration-200 ease-expo hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                {t("header.buildSystem")}
              </Link>
              <Link
                href={`/${locale}/wizard`}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border-[3px] border-[#000000] bg-[#B7D1EA] px-5 py-2.5 text-xs font-black text-[#0F172A] shadow-[4px_4px_0_#000000] transition-all duration-200 ease-expo hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#CBE0F4] hover:shadow-[6px_6px_0_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                {t("header.startWizard")}
              </Link>
            </div>
          </div>
        </header>
        <div className="layer-sticky sticky top-[72px] -mx-4 mb-4 grid grid-cols-2 gap-2 border-y-[3px] border-[#000000] bg-[#F0EEE9] px-4 py-3 lg:hidden">
          <Link
            href={`/${locale}/build`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#000000] bg-white px-3 py-2 text-center text-xs font-black text-[#000000] shadow-[2px_2px_0_#000000] transition hover:bg-[#000000] hover:text-white"
          >
            {t("header.buildSystem")}
          </Link>
          <Link
            href={`/${locale}/wizard`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-[#000000] bg-[#B7D1EA] px-3 py-2 text-center text-xs font-black text-[#0F172A] shadow-[2px_2px_0_#000000] transition hover:bg-[#CBE0F4]"
          >
            {t("header.startWizard")}
          </Link>
        </div>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left Column: Master List */}
          <aside
            className={cn(
              "solar-ui-panel flex h-fit min-h-0 flex-col gap-4 rounded-2xl border-[3px] border-[#000000] bg-white p-4 shadow-[6px_6px_0_#000000] lg:sticky lg:top-24 lg:w-[320px] lg:p-5",
              mobileDetailOpen ? "hidden lg:flex" : "flex",
            )}
          >
            <div className="shrink-0 pb-2 border-b-[3px] border-[#000000]">
              <h2 className="flex items-center gap-1.5 text-base font-black text-[#000000]">
                {t("sidebar.titlePrefix")}{" "}
                <span className="text-[#4F7FA8]">
                  {t("sidebar.titleHighlight")}
                </span>
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-600">
                {t("sidebar.description")}
              </p>
            </div>

            <div role="tablist" aria-label={t("sidebar.titlePrefix")} className="flex shrink-0 items-stretch gap-1.5 rounded-xl border-2 border-[#000000] bg-[#F0EEE9] p-1.5 shadow-[2px_2px_0_#000000]">
              <ProposalListTabButton
                active={proposalListTab === "active"}
                onClick={() => setProposalListTab("active")}
                id="proposals-tab-active"
                controls="proposals-panel-active"
              >
                {t("sidebar.tabs.active")}
              </ProposalListTabButton>
              <ProposalListTabButton
                active={proposalListTab === "archived"}
                onClick={() => setProposalListTab("archived")}
                id="proposals-tab-archived"
                controls="proposals-panel-archived"
              >
                {t("sidebar.tabs.archived")}
              </ProposalListTabButton>
            </div>

            <div
              id={`proposals-panel-${proposalListTab}`}
              role="tabpanel"
              aria-labelledby={`proposals-tab-${proposalListTab}`}
              tabIndex={0}
              className="min-h-0 space-y-3 pr-0 outline-none focus-visible:ring-2 focus-visible:ring-[#4F7FA8] focus-visible:ring-offset-2"
            >
              {displayProposals.length === 0 ? (
                <SolarStatePanel
                  kind="empty"
                  title={t("sidebar.emptyTitle")}
                  description={t("sidebar.emptyDescription")}
                  soliaAlt={locale === "th" ? "โซเลียกำลังรอช่วยเริ่มต้นแผนโซลาร์ของคุณ" : "Solia is ready to help start your solar plan"}
                  action={
                    <Link href={`/${locale}/wizard`} className="solar-ui-primary rounded-full px-4 py-2.5 text-xs font-bold">
                    {t("actions.openCalculator")}
                    </Link>
                  }
                />
              ) : (
                displayProposals.map((proposal) => {
                  const isActiveCard = proposal.id === activeProposalId;
                  const statusUpper =
                    getEffectiveProposalStatus(proposal).toUpperCase();
                  const isInReview =
                    statusUpper === "PENDING_EVALUATION" ||
                    statusUpper === "IN_REVIEW";
                  const isQuotationReady = [
                    "PENDING_CUSTOMER_APPROVAL",
                    "PENDING_CUSTOMER_SIGNATURE",
                    "AWAITING_CLIENT_SIGNATURE",
                    "DISPATCHED",
                    "QUOTATION_READY",
                    "SENT",
                  ].includes(statusUpper);
                  const serviceProposal = isServiceProposal(proposal);
                  const customServiceQuote =
                    serviceProposal &&
                    proposal.configurationData?.pricingStatus ===
                      "CUSTOM_REQUIRED";

                  return (
                    <button
                      type="button"
                      key={proposal.id}
                      ref={(node) => {
                        proposalCardRefs.current[proposal.id] = node;
                      }}
                      onClick={() => handleSelectProposal(proposal.id)}
                      aria-pressed={isActiveCard}
                      className={cn(
                        "w-full cursor-pointer rounded-xl border-2 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7FA8] focus-visible:ring-offset-2",
                        isActiveCard
                          ? "border-[#000000] bg-[#B7D1EA] p-4 text-[#0F172A] shadow-[4px_4px_0_#000000]"
                          : "border-[#000000] bg-white p-3.5 text-[#000000] shadow-none hover:bg-[#F0EEE9]",
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            "font-mono font-black text-xs flex items-center gap-1.5",
                            isActiveCard ? "text-[#0F172A]" : "text-slate-700",
                          )}
                        >
                          {isInReview ? (
                            <>
                              <ClipboardList className="w-3.5 h-3.5" />
                              ใบคำขอ #
                              {proposal.id.substring(0, 8).toUpperCase()}
                            </>
                          ) : (
                            <>
                              <FileText className="w-3.5 h-3.5" />
                              ใบเสนอราคา #
                              {proposal.id.substring(0, 8).toUpperCase()}
                            </>
                          )}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            aria-label={
                              serviceProposal
                                ? t("labels.serviceProposal")
                                : t("labels.installationProposal")
                            }
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border border-black px-2 py-0.5 text-[10px] font-black uppercase",
                              serviceProposal
                                ? "bg-[#B7D1EA] text-[#0F172A]"
                                : "bg-[#F0EEE9] text-[#0F172A]",
                            )}
                          >
                            {serviceProposal ? (
                              <Wrench className="h-3 w-3 stroke-[2.5]" />
                            ) : (
                              <SolarPanel className="h-3 w-3 stroke-[2.5]" />
                            )}
                            {serviceProposal ? t("labels.service") : t("labels.solar")}
                          </span>
                          <span className={cn("text-[10px] font-bold", isActiveCard ? "text-[#334155]" : "text-[#475569]") }>
                            {formatShortDate(proposal.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 mb-2">
                        <div className={cn("text-xs font-bold", isActiveCard ? "text-[#0F172A]" : "text-slate-800")}>
                          {serviceProposal
                            ? serviceSummary(proposal.serviceItems)
                            : t("sidebar.systemSummary", {
                                kwp: proposal.systemSizeKwp.toFixed(2),
                                count: proposal.panelCount,
                              })}
                        </div>
                        {isInReview ? (
                          <div className={cn("inline-flex items-center rounded-md border-2 border-[#000000] px-2 py-0.5 text-[10px] font-bold", isActiveCard ? "bg-[#0F172A] text-[#B7D1EA]" : "bg-[#F0EEE9] text-[#334155]")}>
                            กำลังประเมินสเปกโดยทีมวิศวกร
                          </div>
                        ) : (
                          <div className="text-base font-mono tracking-tight font-black flex items-center justify-between">
                            <span className="text-[#000000]">
                              {customServiceQuote
                                ? "Custom quote pending"
                                : formatCurrency(proposal.totalPrice)}
                            </span>
                            {isQuotationReady && (
                              <span className="relative flex h-2 w-2">
                                <GsapPulse className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75">
                                  <span />
                                </GsapPulse>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {renderStatusBadge(statusUpper)}
                        {isQuotationReady && (
                          <StatusBadge
                            tone="success"
                            className="text-[9px] uppercase tracking-[0.08em]"
                          >
                            รอคุณลงนาม
                          </StatusBadge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Right Column: Main Stage (Comic Page) */}
          <section
            ref={detailPaneRef}
            className={cn(
              "solar-ui-panel relative flex min-h-[28rem] w-full min-w-0 flex-col gap-4 rounded-2xl border-[4px] border-[#000000] bg-white p-4 shadow-[8px_8px_0_#000000] sm:p-6",
              mobileDetailOpen ? "flex" : "hidden lg:flex",
            )}
          >
            {isUpdatingProposal && (
              <div className="layer-raised absolute inset-0 flex flex-col items-center justify-center rounded-xl bg-white/95 transition-opacity duration-200 z-30">
                <div className="flex flex-col items-center gap-3 p-6 border-2 border-black rounded-xl bg-white shadow-[4px_4px_0_#000000]">
                  <GsapSpinner className="h-6 w-6 text-[#000000]" />
                  <p className="text-xs font-black text-[#000000] uppercase tracking-wider">
                    {t("common.updating")}
                  </p>
                </div>
              </div>
            )}
            {sharedDetailProposal ? (
              <>
                <button
                  ref={mobileBackButtonRef}
                  type="button"
                  onClick={handleMobileBack}
                  className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl border-2 border-black bg-white px-4 text-xs font-black text-black shadow-[2px_2px_0_#000000] lg:hidden"
                >
                  ← {t("actions.backToProposals")}
                </button>
                <ProposalDetailView
                  proposal={sharedDetailProposal}
                  presentation="embedded"
                  showAccountCta={false}
                />
              </>
            ) : (
              <SolarStatePanel
                className="flex min-h-[24rem] flex-1 rounded-xl"
                kind="empty"
                title={t("emptySelection.title")}
                description={t("emptySelection.description")}
                soliaAlt={locale === "th" ? "โซเลียกำลังรอให้คุณเลือกใบเสนอราคา" : "Solia is waiting for you to select a proposal"}
                action={
                  <Link href={`/${locale}/wizard`} className="solar-ui-primary rounded-full px-4 py-2.5 text-xs font-bold">
                    {locale === "th" ? "เปิดเครื่องมือคำนวณ" : "Open calculator"}
                  </Link>
                }
              />
            )}
          </section>
        </div>

        {/* Golden Thread Floating Sticky Price Summary Bottom Bar */}
        {activeProposal && (
          <div className="layer-floating sd-safe-pb-3-max fixed inset-x-0 bottom-0 z-40 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-x-0 border-b-0 border-t-[3px] border-[#000000] bg-white px-3 py-3 sm:inset-x-auto sm:bottom-4 sm:left-1/2 sm:flex sm:w-[92%] sm:max-w-4xl sm:-translate-x-1/2 sm:gap-4 sm:rounded-2xl sm:border-[3.5px] sm:p-3.5 sm:shadow-[6px_6px_0_#000000] md:p-4">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="truncate text-[10px] font-black uppercase tracking-wider text-[#475569]">
                  {activeProposal.erpnextQuotationId || `SD-QT-${activeProposal.id.slice(0, 8).toUpperCase()}`}
                </span>
                <span className="truncate text-xs font-black text-[#000000] sm:text-sm">
                  {t("labels.system", {
                    size: activeProposal.systemSizeKwp.toFixed(2),
                  })}
                </span>
              </div>
              <div className="hidden sm:block h-8 w-[2px] bg-black/20" />
              <div className="hidden flex-col sm:flex">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#475569]">
                  {t("labels.totalInvestment")}
                </span>
                <span className="font-mono text-sm font-black text-[#0F172A] sm:text-lg">
                  {formatCurrency(activeProposal.totalPrice)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/${locale}/proposals/${activeProposal.id}`}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border-[3px] border-[#000000] bg-[#B7D1EA] px-3 py-2 text-[11px] font-black uppercase leading-tight text-[#0F172A] shadow-[3px_3px_0_#000000] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#CBE0F4] hover:shadow-[5px_5px_0_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:px-4 sm:text-xs"
              >
                <span>
                  {activeProposal.signedDocumentDriveUrl
                    ? t("actions.viewDetails")
                    : t("actions.confirmQuote")}
                </span>
                <ChevronRight className="h-4 w-4 stroke-[3]" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Signature Modal — triggered by Decision Card Approve button */}
      {isSignatureModalOpen && activeProposal && isPendingCustomerSignature && (
        <Dialog
          isOpen={isSignatureModalOpen}
          onClose={() => {
            setIsSignatureModalOpen(false);
            setSignatureBase64("");
            setHasAcceptedSignatureTerms(false);
          }}
          size="md"
          tone="light"
          ariaLabel={t("signature.title")}
          closeLabel={t("signature.close")}
          className="max-w-lg bg-white"
        >
          <DialogContent>
            <DialogHeader className="border-b-2 border-[#000000] bg-[#F5F2EB]">
              <div className="flex items-center gap-2.5">
                <PenLine className="h-4 w-4 text-emerald-600" />
                <div>
                  <DialogTitle className="text-lg">{t("signature.title")}</DialogTitle>
                  <DialogDescription>{t("signature.description")}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogBody className="space-y-6 bg-white">
              <DigitalSignaturePad
                onSign={(base64) => setSignatureBase64(base64)}
                onClear={() => setSignatureBase64("")}
                label={t("signature.padLabel")}
                placeholder="ลงนามตรงนี้ (Sign Here)"
                clearLabel={t("signature.clear")}
                required={true}
              />
              <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={hasAcceptedSignatureTerms}
                  onChange={(event) =>
                    setHasAcceptedSignatureTerms(event.target.checked)
                  }
                  className="mt-0.5 h-5 w-5 rounded border-2 border-black text-[#4F7FA8] accent-[#4F7FA8] focus:ring-[#B7D1EA]"
                />
                <span className="leading-relaxed">
                  {t("signature.agreement")}
                </span>
              </label>
            </DialogBody>
            <DialogFooter className="border-t-2 border-[#000000] bg-[#F5F2EB]">
              <button
                type="button"
                disabled={
                  !signatureBase64 || !hasAcceptedSignatureTerms || isSigning
                }
                onClick={async () => {
                  const signed = await handleSignProposal(activeProposal.id);
                  if (signed) {
                    setIsSignatureModalOpen(false);
                    setHasAcceptedSignatureTerms(false);
                  }
                }}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#000000] bg-[#B7D1EA] px-5 py-3 text-sm font-black text-[#0F172A] shadow-[3px_3px_0_#000000] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-[#CBE0F4] hover:shadow-[4px_4px_0_#000000] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                {isSigning ? (
                  <>
                    <GsapSpinner className="h-4 w-4" />
                    <span>{t("signature.saving")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t("signature.confirm")}</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {isDocumentReviewOpen && activeProposal && (
        <Dialog
          isOpen={isDocumentReviewOpen}
          onClose={() => setIsDocumentReviewOpen(false)}
          size="full"
          tone="light"
          ariaLabel={t("documentReview.title")}
          closeLabel={t("actions.cancel")}
          className="max-w-4xl bg-white"
        >
          <DialogContent>
            <DialogHeader className="border-b-2 border-[#000000] bg-[#F5F2EB]">
              <DialogTitle>{t("documentReview.title")}</DialogTitle>
              <DialogDescription>{t("documentReview.description")}</DialogDescription>
            </DialogHeader>

            <DialogBody className="bg-white p-4 sm:p-6">
                <div className="relative overflow-hidden rounded-xl border-2 border-[#000000] bg-white">
                <iframe
                  src={
                    activeProposal.signedDocumentDriveUrl ||
                    activeProposal.revisedPdfUrl ||
                    activeProposal.pdfUrl ||
                    "about:blank"
                  }
                  className="h-[min(550px,68dvh)] w-full rounded-xl border-0"
                  title="SolarDream document preview"
                />
              </div>
            </DialogBody>

            <DialogFooter className="flex-col items-stretch border-t-2 border-[#000000] bg-[#F5F2EB] sm:flex-row sm:items-center sm:justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#64748B]">
                {t("labels.securePortal")}
              </span>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsDocumentReviewOpen(false)}
                  className="min-h-11 cursor-pointer rounded-xl border-2 border-[#000000] bg-white px-4 py-2 text-xs font-black text-[#0F172A] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-[#F0EEE9] hover:shadow-[2px_2px_0_#000000] active:translate-y-0.5 active:shadow-none"
                >
                  {t("actions.cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDocumentReviewComplete}
                  className="min-h-11 cursor-pointer rounded-xl border-2 border-[#000000] bg-[#B7D1EA] px-5 py-2.5 text-xs font-black text-[#0F172A] shadow-[2px_2px_0_#000000] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-[#CBE0F4] hover:shadow-[3px_3px_0_#000000] active:translate-y-0.5 active:shadow-none"
                >
                  {t("documentReview.simulateComplete")}
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen Overlay Modal */}
      {isFullscreen && selectedFile && previewUrl && (
        <Dialog
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          size="full"
          tone="dark"
          ariaLabel={t("fullscreen.title", { name: selectedFile.name })}
          closeLabel={t("fullscreen.exit")}
          className="h-dvh max-h-dvh w-screen max-w-none rounded-none border-0 bg-slate-950"
        >
          <DialogContent>
            <DialogHeader className="border-b-2 border-[#000000] bg-[#0F172A] px-5 py-4 sm:px-6 sm:py-4">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold">
                <Maximize2 className="h-4 w-4 text-[#B7D1EA]" />
                {t("fullscreen.title", { name: selectedFile.name })}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {selectedFile.name}
              </DialogDescription>
            </DialogHeader>

          {/* Canvas */}
          <DialogBody className="flex max-h-none flex-1 items-center justify-center overflow-auto bg-slate-950 p-6">
            <div
              style={{ transform: `scale(${scale})` }}
              className="flex max-h-full max-w-full items-center justify-center transition-transform duration-150 motion-reduce:transition-none"
            >
              {selectedFile.type.startsWith("image/") ? (
                <div className="relative max-h-[85vh] w-[85vw] min-h-[60vh]">
                  <ProgressiveImage
                    src={previewUrl}
                    alt="Fullscreen Preview"
                    fill
                    sizes="85vw"
                    className="max-h-[85vh] rounded-xl object-contain"
                  />
                </div>
              ) : isPdfFile(selectedFile) ? (
                <embed
                  src={previewUrl}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  className="h-[80vh] w-[85vw] rounded-xl border border-white/10 bg-white"
                  title={`Fullscreen local PDF preview: ${selectedFile.name}`}
                />
              ) : (
                <div className="w-[85vw] h-[80vh] rounded-xl border border-slate-200/60 bg-brand-surface flex items-center justify-center p-8 text-center">
                  <div className="max-w-sm">
                    <FileText className="w-10 h-10 text-[#B7D1EA] mx-auto mb-3" />
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      {t("preview.unavailableTitle")}
                    </h4>
                    <p className="text-xs font-semibold leading-relaxed text-[#475569] mt-2">
                      {t("preview.verifyInNewTabDescription")}
                    </p>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#B7D1EA] px-4 py-2.5 text-sm font-bold text-[#2C486A] transition-colors hover:bg-[#B7D1EA]/80"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{t("preview.viewInNewTab")}</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </DialogBody>

          {/* Floating Controls inside Fullscreen Mode */}
          <div className="layer-raised sd-safe-bottom-6-max absolute right-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
              aria-label={t("fullscreen.zoomOut")}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
              title={t("fullscreen.zoomOut")}
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-[#475569]">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              aria-label={t("fullscreen.zoomIn")}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
              title={t("fullscreen.zoomIn")}
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              aria-label={t("fullscreen.exit")}
              className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-slate-100"
              title={t("fullscreen.exit")}
            >
              <Maximize2 className="w-4 h-4 text-[#B7D1EA]" />
            </button>
          </div>
          </DialogContent>
        </Dialog>
      )}

      {isCancelModalOpen && (
        <Dialog
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          size="sm"
          tone="light"
          ariaLabel={t("cancelModal.title")}
          closeLabel={t("actions.cancel")}
          className="bg-white"
        >
          <DialogContent>
            <DialogHeader className="border-b-2 border-[#000000] bg-[#F5F2EB]">
              <DialogTitle>{t("cancelModal.title")}</DialogTitle>
              <DialogDescription>{t("cancelModal.description")}</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4 bg-white">
              <div className="space-y-1.5">
                <label htmlFor="proposal-cancel-reason" className="text-xs font-bold text-slate-600">
                  {t("cancelModal.reasonLabel")}
                </label>
                <textarea
                  id="proposal-cancel-reason"
                  rows={4}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-[#F5F2EB] px-4 py-3 text-sm text-slate-900 transition-colors focus:border-[#7EAED4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B7D1EA]/40"
                  placeholder={t("cancelModal.reasonPlaceholder")}
                />
              </div>
            </DialogBody>
            <DialogFooter className="flex-col-reverse border-t border-slate-200 bg-[#F5F2EB] sm:flex-row">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="min-h-11 cursor-pointer rounded-xl border-2 border-[#000000] bg-white px-4 py-2 text-xs font-black text-[#0F172A] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-[#F0EEE9] hover:shadow-[2px_2px_0_#000000] active:translate-y-0.5 active:shadow-none"
              >
                {t("actions.cancel")}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleRequestCancellation}
                className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCancelling ? (
                  <>
                    <GsapSpinner className="h-3.5 w-3.5 text-white" />
                    <span>{t("actions.processing")}</span>
                  </>
                ) : (
                  <span>{t("cancelModal.submit")}</span>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && activeProposal && (
        <Dialog
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            handleRemovePaymentFile();
          }}
          size="md"
          tone="light"
          ariaLabel={isDeposit ? "ชำระเงินมัดจำ (Pay Deposit)" : "ชำระเงิน (Make Payment)"}
          closeLabel={t("actions.cancel")}
          className="max-w-xl bg-white"
        >
          <DialogContent>
            <DialogHeader className="border-b-2 border-[#000000] bg-[#F5F2EB]">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#4F7FA8]" />
                <div>
                  <DialogTitle>
                    {isDeposit
                      ? "ชำระเงินมัดจำ (Pay Deposit)"
                      : "ชำระเงิน (Make Payment)"}
                  </DialogTitle>
                  <DialogDescription>
                    สแกน PromptPay แล้วอัปโหลดหลักฐานการชำระเงิน
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <DialogBody className="space-y-5 bg-white sm:space-y-6">
              {/* QR Code display */}
              <section className="space-y-4 text-center">
                {promptpayPayload ? (
                  <div className="bg-[#F0EEE9]/30 p-4 rounded-xl border border-slate-200/60 max-w-xs mx-auto flex items-center justify-center">
                    <QRCodeSVG
                      value={promptpayPayload}
                      size={180}
                      includeMargin
                      className="bg-white p-2 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800">
                    ระบบชำระเงินยังไม่ได้ตั้งค่า PromptPay
                    กรุณาติดต่อทีมงานเพื่อรับช่องทางชำระเงิน
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {isDeposit
                      ? "ยอดชำระมัดจำ (Deposit Amount)"
                      : "ยอดชำระ (Payment Amount)"}
                  </p>
                  <h4 className="text-3xl font-black text-[#2C486A] font-mono tracking-tight">
                    {formatCurrency(activeAmount)}
                  </h4>
                  {isDeposit && (
                    <p className="text-xs font-bold text-[#334155] mt-2 bg-[#F0EEE9] py-1.5 px-3 rounded-lg border-2 border-[#000000]">
                      ยอดชำระมัดจำเพื่อเริ่มงาน: {formatCurrency(activeAmount)}{" "}
                      (จากยอดรวมทั้งหมด{" "}
                      {formatCurrency(activeProposal.totalPrice)})
                    </p>
                  )}
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                    กรุณาสแกนคิวอาร์โค้ดด้วยแอปพลิเคชันธนาคาร
                  </p>
                </div>
              </section>

              {/* Slip Uploader */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  อัปโหลดหลักฐานการโอนเงิน (Upload Bank Slip)
                </label>
                {!paymentPreviewUrl ? (
                  <div
                    onDragEnter={handlePaymentDrag}
                    onDragOver={handlePaymentDrag}
                    onDragLeave={handlePaymentDrag}
                    onDrop={handlePaymentDrop}
                    className={`relative flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                      paymentDragActive
                        ? "border-black bg-[#B7D1EA]/25 scale-[1.01]"
                        : "border-2 border-black hover:border-[#4F7FA8] bg-white hover:bg-[#F0EEE9]"
                    }`}
                  >
                    <label className="flex flex-col items-center justify-center w-full h-full text-center px-4 cursor-pointer">
                      <Upload
                        className={`mb-2 h-8 w-8 transition-colors ${paymentDragActive ? "text-[#4F7FA8]" : "text-[#64748B]"}`}
                      />
                      <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        ลากไฟล์สลิปมาวาง หรือ คลิกเพื่ออัปโหลด
                      </p>
                      <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest mt-1.5">
                        รองรับไฟล์ JPG, PNG, WEBP เท่านั้น (ไม่เกิน 5MB)
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg, image/png, image/webp"
                        onChange={handlePaymentFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative aspect-video overflow-hidden rounded-2xl border-2 border-black bg-[#F0EEE9]">
                    <ProgressiveImage
                      src={paymentPreviewUrl}
                      alt="Bank Slip Preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 640px"
                      className="object-contain p-2"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={handleRemovePaymentFile}
                      aria-label="Remove payment slip"
                      className="absolute right-3 top-3 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </DialogBody>
            <DialogFooter className="border-t-2 border-[#000000] bg-[#F5F2EB]">
              <button
                type="button"
                disabled={
                  !paymentFile ||
                  !promptpayPayload ||
                  isUploadingPayment ||
                  isVerifyingPayment
                }
                onClick={handleVerifyPayment}
                className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#000000] bg-[#B7D1EA] px-5 py-3.5 text-sm font-black text-[#0F172A] shadow-[3px_3px_0_#000000] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-[#CBE0F4] hover:shadow-[4px_4px_0_#000000] active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                {isVerifyingPayment ? (
                  <>
                    <GsapSpinner className="h-4 w-4" />
                    <span>กำลังตรวจสอบการชำระเงิน...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>ยืนยันการชำระเงิน (Verify Payment)</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
