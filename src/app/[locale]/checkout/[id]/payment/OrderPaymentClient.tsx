"use client";

import { useCallback, useState, useTransition, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { approveProposalContract, uploadProposalContractDocument } from "@/app/actions/proposals";
import { processPaymentRequestSlipAction, getPaymentRequestStatusAction } from "@/app/actions/paymentRequests";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import SignatureCanvas from "react-signature-canvas";
import confetti from "canvas-confetti";
import { gsap } from "gsap";
import { 
  Upload, 
  X, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Lock, 
  ExternalLink,
  Calendar,
  FileText,
  Clock,
  Map,
  PenTool,
  CheckCircle2,
  Trash2,
  LockKeyhole
} from "@/components/ui/icons";
import { buildPromptPayPayload } from "@/lib/promptpay";
import ProgressiveImage from "@/components/ui/progressive-image";
import { GsapPulse, GsapReveal, GsapSpinner } from "@/components/ui/GsapMotion";
import SmartBackButton from "@/components/ui/SmartBackButton";
import { SolarStatePanel } from "@/components/ui/solar-system";
import { useTranslations } from "next-intl";

// Load InstallationMapPicker dynamically with SSR disabled due to Leaflet window requirement
const InstallationMapPicker = dynamic(
  () => import("@/components/wizard/InstallationMapPicker"),
  {
    ssr: false,
    loading: () => (
      <GsapPulse className="h-[300px] w-full bg-slate-100 flex flex-col items-center justify-center rounded-3xl border border-slate-200">
        <GsapSpinner className="w-8 h-8 text-[#B7D1EA] mb-2" />
        <p className="text-xs text-slate-500 font-bold font-sans">กำลังโหลดแผนที่ปักหมุด...</p>
      </GsapPulse>
    ),
  }
);

function isObjectUrl(value: string | null): value is string {
  return Boolean(value?.startsWith("blob:"));
}

const subscribeToHydration = () => () => {};
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

interface VerifiedSlip {
  id: string;
  slipImageUrl: string;
  verifiedAt: Date;
}

interface PaymentMilestone {
  id: string;
  orderId: string;
  milestoneOrder: number;
  milestoneName: string;
  percentage: string;
  amount: string;
  status: "PENDING" | "ACTIVE" | "PAID" | "OVERDUE";
  dueDate: Date | null;
  paidAt: Date | null;
  verifiedSlip?: VerifiedSlip | null;
}

interface ActivePaymentRequest {
  id: string;
  amountRequested: number | null;
  title: string;
}

type ConfigurationItem = Record<string, unknown>;
type ConfigurationData = Record<string, unknown> & {
  items?: ConfigurationItem[];
  installationLatitude?: number | string | null;
  installationLongitude?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  installationMapAddress?: string | null;
  address?: string | null;
  installationMapNotes?: string | null;
  notes?: string | null;
  idCardUrl?: string | null;
  electricityBillUrl?: string | null;
};

type VerifySlipApiResponse = {
  success: boolean;
  error?: string;
  payment?: {
    milestoneName: string;
    amount: number;
    transRef: string;
    paidAt: string;
  };
};

interface OrderPaymentClientProps {
  orderId: string;
  milestones: PaymentMilestone[];
  locale: string;
  fulfillmentType: string;
  orderStatus: string;
  configurationData: ConfigurationData;
  systemSizeKwp?: number;
  panelCount?: number;
  activePaymentRequest?: ActivePaymentRequest | null;
  paymentSession?: {
    id: string;
    qrString: string;
    expiresAt: string;
    amount: number | null;
  } | null;
}

function toPositiveAmount(value: number | string | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function OrderPaymentClient({
  orderId,
  milestones,
  locale,
  fulfillmentType,
  orderStatus,
  configurationData,
  systemSizeKwp,
  panelCount,
  activePaymentRequest,
  paymentSession,
}: OrderPaymentClientProps) {
  const router = useRouter();
  const t = useTranslations("OrderPayment");
  const [isPending, startTransition] = useTransition();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  // General slip upload states (active milestone slip)
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [paymentVerificationState, setPaymentVerificationState] = useState<
    "IDLE" | "VALIDATING" | "LEDGER" | "SUCCESS"
  >("IDLE");

  // SUPPLY_ONLY timer soft-lock (30 minutes in seconds)
  const isSupplyOnly = fulfillmentType === "SUPPLY_ONLY";
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!paymentSession?.expiresAt) return 1800;
    return Math.max(
      0,
      Math.ceil((new Date(paymentSession.expiresAt).getTime() - Date.now()) / 1000),
    );
  });

  // WAITING_SIGNATURE form states
  const [mapLatitude, setMapLatitude] = useState<number | null>(() => {
    return Number(configurationData?.installationLatitude) || Number(configurationData?.latitude) || null;
  });
  const [mapLongitude, setMapLongitude] = useState<number | null>(() => {
    return Number(configurationData?.installationLongitude) || Number(configurationData?.longitude) || null;
  });
  const [mapAddress, setMapAddress] = useState<string>(() => {
    return configurationData?.installationMapAddress || configurationData?.address || "";
  });
  const [mapNotes, setMapNotes] = useState<string>(() => {
    return configurationData?.installationMapNotes || configurationData?.notes || "";
  });

  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [hasSigned, setHasSigned] = useState(false);

  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(() => {
    return configurationData?.idCardUrl || null;
  });
  
  const [billFile, setBillFile] = useState<File | null>(null);
  const [billPreview, setBillPreview] = useState<string | null>(() => {
    return configurationData?.electricityBillUrl || null;
  });

  useEffect(() => {
    return () => {
      if (isObjectUrl(previewUrl)) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (isObjectUrl(idCardPreview)) {
        URL.revokeObjectURL(idCardPreview);
      }
    };
  }, [idCardPreview]);

  useEffect(() => {
    return () => {
      if (isObjectUrl(billPreview)) {
        URL.revokeObjectURL(billPreview);
      }
    };
  }, [billPreview]);

  useEffect(() => {
    if (!isSupplyOnly) return;
    const sessionExpiry = paymentSession?.expiresAt
      ? new Date(paymentSession.expiresAt).getTime()
      : null;
    const interval = setInterval(() => {
      setTimeLeft((previousTimeLeft) => {
        const nextTimeLeft = sessionExpiry
          ? Math.max(0, Math.ceil((sessionExpiry - Date.now()) / 1000))
          : Math.max(0, previousTimeLeft - 1);
        if (nextTimeLeft === 0) {
          clearInterval(interval);
        }
        return nextTimeLeft;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSupplyOnly, paymentSession?.expiresAt]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Find active milestone
  const activeMilestone = milestones.find((m) => m.status === "ACTIVE");
  const rawActiveAmount =
    activePaymentRequest
      ? activePaymentRequest.amountRequested
      : (paymentSession?.amount ??
         (activeMilestone?.amount ?? null));
  const activeAmount = toPositiveAmount(rawActiveAmount);

  const promptpayPayload =
    paymentSession?.qrString ||
    (activeAmount !== null ? buildPromptPayPayload(activeAmount) : null);

  const handlePaymentConfirmed = useCallback(() => {
    if (paymentVerificationState === "SUCCESS") return;

    setPaymentVerificationState("SUCCESS");
    setIsUploading(false);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reducedMotion) {
      void confetti({
        particleCount: 120,
        spread: 72,
        origin: { y: 0.68 },
        colors: ["#B7D1EA", "#2C486A", "#D8A87B", "#F5F2EB"],
        disableForReducedMotion: true,
      });
    }

    window.setTimeout(() => {
      router.push(`/${locale}/proposals?activeId=${encodeURIComponent(orderId)}`);
    }, reducedMotion ? 350 : 1700);
  }, [locale, orderId, paymentVerificationState, router]);

  const pollPaymentRequestNow = async () => {
    if (!activePaymentRequest) return false;
    const res = await getPaymentRequestStatusAction(activePaymentRequest.id);
    if (res.success && res.status === "PAID") {
      handlePaymentConfirmed();
      return true;
    }
    return false;
  };

  // Poll payment request status
  useEffect(() => {
    if (!activePaymentRequest || paymentVerificationState !== "VALIDATING") return;

    let cancelled = false;
    const timeoutMs = 60_000;
    const intervalMs = 1500;
    const startedAt = Date.now();

    const runPoll = async () => {
      if (cancelled) return;
      const res = await getPaymentRequestStatusAction(activePaymentRequest.id);
      if (res.success && res.status === "PAID") {
        handlePaymentConfirmed();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        setPaymentVerificationState("IDLE");
        setIsUploading(false);
        toast.error(
          locale === "th"
            ? "การยืนยันใช้เวลานานกว่าปกติ กรุณาตรวจสอบสถานะอีกครั้ง"
            : "Verification is taking longer than expected. Please check the status again."
        );
      }
    };

    const intervalId = setInterval(runPoll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activePaymentRequest, handlePaymentConfirmed, paymentVerificationState, locale]);

  const formatMoney = (value: number | null) => {
    if (value === null || !Number.isFinite(value) || value <= 0) {
      return t("amountPending");
    }

    return value.toLocaleString("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    });
  };

  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleString(locale === "th" ? "th-TH" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Drag & drop handlers for primary payment slip
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateAndSetSlipFile = (selectedFile: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error(
        locale === "th" 
          ? "รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัปโหลดรูปภาพสลิปเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น" 
          : "Invalid file format. Please upload JPG, PNG, or WEBP slips."
      );
      return;
    }
    const maxSize = 12 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(
        locale === "th" 
          ? "ขนาดไฟล์รูปภาพต้องไม่เกิน 12MB"
          : "File size must not exceed 12MB."
      );
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetSlipFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetSlipFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl(null);
  };

  // Verification slip upload
  const handleVerifyPayment = async () => {
    if (!activePaymentRequest && !activeMilestone) {
      toast.error(
        locale === "th" 
          ? "ไม่พบงวดการชำระเงินที่ต้องชำระในขณะนี้" 
          : "No active payment milestone found."
      );
      return;
    }
    if (!file) {
      toast.error(
        locale === "th" 
          ? "กรุณาอัปโหลดหลักฐานการชำระเงิน (สลิปธนาคาร)" 
          : "Please upload your payment slip."
      );
      return;
    }

    setIsUploading(true);
    setPaymentVerificationState("VALIDATING");
    try {
      const formData = new FormData();
      formData.set("file", file, file.name);

      if (activePaymentRequest) {
        const result = await processPaymentRequestSlipAction(activePaymentRequest.id, formData);
        if (!result.success) {
          throw new Error(result.error || "Payment verification failed.");
        }
        if (result.warning) {
          toast.warning(result.warning, { duration: 8000 });
        }
        await pollPaymentRequestNow();
      } else if (activeMilestone) {
        formData.set("quotation_id", orderId);
        formData.set("milestone_index", String(activeMilestone.milestoneOrder));
        formData.set("slip_image", file, file.name);
        const response = await fetch("/api/payments/verify-slip", {
          method: "POST",
          body: formData,
        });
        const result = await response.json() as VerifySlipApiResponse;
        if (!response.ok || !result.success || !result.payment) {
          throw new Error(result.error || "Payment verification failed.");
        }
        setPaymentVerificationState("LEDGER");
        await new Promise<void>((resolve) => window.setTimeout(resolve, 450));
        handlePaymentConfirmed();
      }
    } catch (error: unknown) {
      setPaymentVerificationState("IDLE");
      setIsUploading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : locale === "th"
            ? "เกิดข้อผิดพลาดในการตรวจสอบการชำระเงิน"
            : "Payment verification failed.",
      );
    }
  };

  // WAITING_SIGNATURE handlers for document uploads (ID Card & Electricity Bill)
  const validateDocFile = (fileToValidate: File) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(fileToValidate.type)) {
      toast.error("กรุณาอัปโหลดรูปภาพเฉพาะไฟล์ JPG, PNG, WEBP เท่านั้น");
      return false;
    }
    if (fileToValidate.size > 5 * 1024 * 1024) {
      toast.error("ขนาดไฟล์รูปภาพต้องไม่เกิน 5MB");
      return false;
    }
    return true;
  };

  const handleDocUpload = (type: "idcard" | "bill", e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (validateDocFile(selected)) {
        if (type === "idcard") {
          setIdCardFile(selected);
          setIdCardPreview(URL.createObjectURL(selected));
        } else {
          setBillFile(selected);
          setBillPreview(URL.createObjectURL(selected));
        }
      }
    }
  };

  const removeDoc = (type: "idcard" | "bill") => {
    if (type === "idcard") {
      setIdCardFile(null);
      setIdCardPreview(null);
    } else {
      setBillFile(null);
      setBillPreview(null);
    }
  };

  // Submit the contract signature and details
  const handleSubmitContract = async () => {
    if (!mapLatitude || !mapLongitude || !mapAddress) {
      toast.error("กรุณาปักหมุดพิกัดตำแหน่งติดตั้งบนแผนที่ให้เรียบร้อย");
      return;
    }
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      toast.error("กรุณาเซ็นชื่อรับรองสัญญาในกรอบลายมือชื่อ");
      return;
    }
    if (!idCardFile && !idCardPreview) {
      toast.error("กรุณาอัปโหลดสำเนาบัตรประชาชน");
      return;
    }
    if (!billFile && !billPreview) {
      toast.error("กรุณาอัปโหลดบิลค่าไฟ");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Upload ID card
      let idCardUrl = idCardPreview || "";
      if (idCardFile) {
        const idCardFormData = new FormData();
        idCardFormData.append("file", idCardFile);
        const idCardResult = await uploadProposalContractDocument(orderId, "idcard", idCardFormData);
        if (!idCardResult.success) {
          throw new Error(`ไม่สามารถอัปโหลดบัตรประชาชนได้: ${idCardResult.error}`);
        }
        idCardUrl = idCardResult.url;
      }

      // 2. Upload electricity bill
      let electricityBillUrl = billPreview || "";
      if (billFile) {
        const billFormData = new FormData();
        billFormData.append("file", billFile);
        const billResult = await uploadProposalContractDocument(orderId, "bill", billFormData);
        if (!billResult.success) {
          throw new Error(`ไม่สามารถอัปโหลดบิลค่าไฟได้: ${billResult.error}`);
        }
        electricityBillUrl = billResult.url;
      }

      // 3. Save signature & trigger Server Action
      const sigBase64 = sigCanvasRef.current.getTrimmedCanvas().toDataURL("image/png");

      startTransition(async () => {
        try {
          const res = await approveProposalContract(
            orderId,
            { latitude: mapLatitude, longitude: mapLongitude, address: mapAddress },
            sigBase64,
            idCardUrl,
            electricityBillUrl
          );

          if (res.success) {
            toast.success("อนุมัติสัญญาและยืนยันข้อมูลจัดจ้างเสร็จสิ้น");
            router.refresh();
          } else {
            toast.error(res.error || "เกิดข้อผิดพลาดในการลงนามสัญญา");
            setIsUploading(false);
          }
        } catch (err: unknown) {
          toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเรียกเซิร์ฟเวอร์");
          setIsUploading(false);
        }
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการประมวลผลเอกสาร");
      setIsUploading(false);
    }
  };

  // Main UI Condition logic
  const isUnderSurvey = 
    !isSupplyOnly && 
    !activePaymentRequest &&
    (orderStatus === "PENDING_SALES_REVIEW" || 
     orderStatus === "WAITING_SURVEY" || 
     orderStatus === "BOM_ADJUSTING");

  const isWaitingSignature = 
    !isSupplyOnly && 
    !activePaymentRequest &&
    (orderStatus === "WAITING_SIGNATURE");

  const isMilestoneActive =
    !isSupplyOnly &&
    (!!activePaymentRequest || (!isUnderSurvey && !isWaitingSignature));

  // Prevent SSR hydration checks from crashing map picker
  if (!mounted) {
    return (
      <SolarStatePanel
        kind="loading"
        title={t("loadingTitle")}
        description={t("loadingDescription")}
        soliaAlt={t("loadingSoliaAlt")}
        className="my-8"
      />
    );
  }

  return (
    <GsapReveal className="space-y-8 font-sans">
      
      {/* Full screen transaction loading blocking state */}
      {(isPending || isUploading || paymentVerificationState === "VALIDATING" || paymentVerificationState === "LEDGER") && (
        <GsapReveal className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <GsapSpinner className="w-16 h-16 text-[#B7D1EA] mb-4" />
          <h2 className="text-xl font-black text-white tracking-wider text-center px-4">
            {isWaitingSignature
              ? t("processingSignature")
              : paymentVerificationState === "LEDGER"
                ? t("updatingLedger")
                : t("validatingSlip")
            }
          </h2>
          <p className="text-xs text-slate-350 font-semibold tracking-wide mt-2 text-center px-4">
            {t("safeProcessing")}
          </p>
        </GsapReveal>
      )}

      {paymentVerificationState === "SUCCESS" && (
          <GsapSuccessOverlay>
            <div className="max-w-md text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-10 w-10" />
              </span>
              <h2 className="mt-5 text-3xl font-black text-slate-950">
                {t("successTitle")}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                {t("successDescription")}
              </p>
            </div>
          </GsapSuccessOverlay>
        )}

      {/* Shared Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <SmartBackButton fallbackHref="/proposals" label={t("back")} />
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-sans">
            {activePaymentRequest ? (
              t("headings.custom")
            ) : isSupplyOnly ? (
              t("headings.direct")
            ) : isUnderSurvey ? (
              t("headings.survey")
            ) : isWaitingSignature ? (
              t("headings.contract")
            ) : (
              t("headings.milestones")
            )}
          </h1>
          <p className="text-slate-500 text-xs mt-1 uppercase font-black tracking-widest leading-relaxed">
            {activePaymentRequest
              ? t("descriptions.custom")
              : isSupplyOnly 
              ? t("descriptions.direct")
              : isUnderSurvey
              ? t("descriptions.survey")
              : isWaitingSignature
              ? t("descriptions.contract")
              : t("descriptions.milestones")
            }
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-[#F5F2EB] border border-slate-200 px-4 py-2.5 rounded-2xl text-[10px] font-mono font-black uppercase text-slate-650 self-start sm:self-auto shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>{t("secureTransaction")}</span>
        </div>
      </div>

      {/* CASE 0: Custom Payment Request Active */}
      {activePaymentRequest && (
        <GsapReveal className="space-y-6">
          {/* Info Alert banner */}
          <div className="bg-[#B7D1EA]/10 border border-[#B7D1EA]/35 rounded-[1.5rem] p-5 flex items-start gap-4 shadow-xs">
            <AlertCircle className="w-5 h-5 text-[#2C486A] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-[#2C486A] uppercase tracking-wider">
                มีคำขอชำระเงินค้างอยู่ (Pending Payment Request)
              </p>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {activePaymentRequest.title}
              </p>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide mt-1 uppercase">
                กรุณาชำระเงินผ่านคิวอาร์โค้ดด้านล่างและอัปโหลดสลิปยืนยันการทำรายการ
              </p>
            </div>
          </div>

          <div className="solar-route-card rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-[#F5F2EB]/50">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2C486A]">
                  รายละเอียดคำขอชำระเงิน (Payment Request Details)
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {activePaymentRequest.title}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ยอดที่ต้องชำระ (Requested Amount)
                </p>
                <p className="text-3xl font-black text-[#D8A87B] font-mono tracking-tight">
                  {formatMoney(activeAmount)}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* PromptPay QR code */}
              <div className="space-y-4 text-center bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
                {promptpayPayload ? (
                  <div className="bg-[#F0EEE9]/30 p-4 rounded-2xl border border-slate-200/60 max-w-xs mx-auto flex items-center justify-center">
                    <QRCodeSVG value={promptpayPayload} size={200} includeMargin />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800">
                    ระบบชำระเงินยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อทีมงานเพื่อรับช่องทางชำระเงิน
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2C486A]">
                    ยอดสแกนคิวอาร์โค้ด
                  </p>
                  <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {formatMoney(activeAmount)}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    กรุณาสแกนคิวอาร์โค้ดด้านบนด้วยแอปพลิเคชันธนาคาร
                  </p>
                </div>
              </div>

              {/* Slip bank Uploader */}
              <div className="space-y-6 flex flex-col justify-between min-h-[300px]">
                <div className="space-y-4">
                  {!previewUrl ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                        dragActive
                          ? "border-[#B7D1EA] bg-[#B7D1EA]/5 scale-[1.01]"
                          : "border-slate-300 hover:border-[#B7D1EA] bg-white hover:bg-slate-50/50"
                      }`}
                    >
                      <label className="flex flex-col items-center justify-center w-full h-full text-center px-4 cursor-pointer">
                        <Upload className={`w-10 h-10 mb-3 transition-colors ${dragActive ? "text-[#2C486A]" : "text-slate-400"}`} />
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          ลากไฟล์สลิปมาวาง หรือ คลิกเพื่ออัปโหลด
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                          รองรับไฟล์ JPG, PNG, WEBP เท่านั้น (ไม่เกิน 12MB)
                        </p>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-slate-300 shadow-md bg-slate-950/5">
                      <ProgressiveImage
                        src={previewUrl}
                        alt="Payment Request Slip Preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 640px"
                        className="object-contain p-2"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-[#B7D1EA]/10 border border-[#B7D1EA]/30 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] font-semibold text-[#2C486A] leading-relaxed">
                      <p className="font-black text-slate-900 mb-0.5">การตรวจสอบสลิปเงินมัดจำ</p>
                      กรุณาตรวจสอบจำนวนเงินโอนให้ตรงกับยอดที่ขอชำระ สลิปจะถูกเชื่อมโยงและปรับสถานะโครงการอัตโนมัติ
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyPayment}
                    disabled={!file || !promptpayPayload}
                    className="w-full bg-[#B7D1EA] hover:bg-[#a5c2de] disabled:bg-slate-200 text-slate-900 disabled:text-slate-400 py-4 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer active:scale-[0.99] hover:scale-[1.01]"
                  >
                    <span>ยืนยันการชำระเงินมัดจำ (Verify Payment)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GsapReveal>
      )}

      {/* CASE 1: SUPPLY_ONLY view */}
      {isSupplyOnly && !activePaymentRequest && (
        <div className="space-y-6">
          {/* Timer alert soft-lock */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-[1.5rem] p-4 flex items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <GsapPulse className="shrink-0" scale={1.08}>
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </GsapPulse>
              <div>
                <p className="text-xs font-black text-amber-800 uppercase tracking-wider">
                  กรุณาชำระเงินภายใน {formatTimer(timeLeft)} นาทีเพื่อล็อกสต็อกสินค้า
                </p>
                <p className="text-[10px] text-amber-700/80 font-bold tracking-wide mt-0.5">
                  {t("stockHoldRelease")}
                </p>
              </div>
            </div>
            <div className="text-lg font-black font-mono text-amber-700 tracking-wider">
              {formatTimer(timeLeft)}
            </div>
          </div>

          <div className="solar-route-card rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-[#F5F2EB]/50">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#2C486A]">
                  ใบสั่งซื้อเลขที่ (Order Ref)
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  #{orderId.slice(0, 8).toUpperCase()}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  ยอดที่ต้องชำระ (Total Amount)
                </p>
                <p className="text-3xl font-black text-[#D8A87B] font-mono tracking-tight">
                  {formatMoney(activeAmount)}
                </p>
              </div>
            </div>

            <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* PromptPay QR code */}
              <div className="space-y-4 text-center bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
                {promptpayPayload ? (
                  <div className="bg-[#F0EEE9]/30 p-4 rounded-2xl border border-slate-200/60 max-w-xs mx-auto flex items-center justify-center">
                    <QRCodeSVG value={promptpayPayload} size={200} includeMargin />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800">
                    ระบบชำระเงินยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อทีมงานเพื่อรับช่องทางชำระเงิน
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#2C486A]">
                    ยอดสแกนคิวอาร์โค้ด
                  </p>
                  <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {formatMoney(activeAmount)}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    กรุณาสแกนคิวอาร์โค้ดด้านบนด้วยแอปพลิเคชันธนาคาร
                  </p>
                </div>
              </div>

              {/* Slip bank Uploader */}
              <div className="space-y-6 flex flex-col justify-between min-h-[300px]">
                <div className="space-y-4">
                  {!previewUrl ? (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                        dragActive
                          ? "border-[#B7D1EA] bg-[#B7D1EA]/5 scale-[1.01]"
                          : "border-slate-300 hover:border-[#B7D1EA] bg-white hover:bg-slate-50/50"
                      }`}
                    >
                      <label className="flex flex-col items-center justify-center w-full h-full text-center px-4 cursor-pointer">
                        <Upload className={`w-10 h-10 mb-3 transition-colors ${dragActive ? "text-[#2C486A]" : "text-slate-400"}`} />
                        <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          ลากไฟล์สลิปมาวาง หรือ คลิกเพื่ออัปโหลด
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                          รองรับไฟล์ JPG, PNG, WEBP เท่านั้น (ไม่เกิน 12MB)
                        </p>
                        <input
                          type="file"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-slate-300 shadow-md bg-slate-950/5">
                      <ProgressiveImage
                        src={previewUrl}
                        alt="Payment Slip Preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 640px"
                        className="object-contain p-2"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-[#B7D1EA]/10 border border-[#B7D1EA]/30 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] font-semibold text-[#2C486A] leading-relaxed">
                      <p className="font-black text-slate-900 mb-0.5">การตรวจสอบสลิป</p>
                      กรุณาตรวจสอบจำนวนเงินให้ถูกต้องตรงตามยอดสั่งซื้อ คิวอาร์โค้ดนี้ถูกผูกเข้ากับรายการล็อกสต็อกสินค้าอย่างปลอดภัย
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyPayment}
                    disabled={!file || !promptpayPayload}
                    className="w-full bg-[#B7D1EA] hover:bg-[#a5c2de] disabled:bg-slate-200 text-slate-900 disabled:text-slate-400 py-4 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer active:scale-[0.99] hover:scale-[1.01]"
                  >
                    <span>ยืนยันการชำระเงิน (Verify Payment)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASE 2: INSTALLATION view */}
      {!isSupplyOnly && (
        <div className="space-y-8">
          
          {/* Subcase 2.1: PENDING_SALES_REVIEW, WAITING_SURVEY or BOM_ADJUSTING status board (Under Survey) */}
          {isUnderSurvey && (
            <div className="solar-route-card rounded-3xl border border-amber-250 bg-[#F1D6B8]/10 p-8 sm:p-12 text-center shadow-xs max-w-2xl mx-auto space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#F1D6B8]/20 flex items-center justify-center text-amber-800">
                <GsapSlowRotate>
                  <Clock className="w-8 h-8" />
                </GsapSlowRotate>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-800">
                  ขั้นตอนถัดไป (Next Step)
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                  อยู่ระหว่างเตรียมการสำรวจหน้างาน
                </h2>
                <p className="text-sm font-semibold text-slate-700 leading-relaxed max-w-lg mx-auto pt-2">
                  ขั้นตอนถัดไป: วิศวกรกำลังจัดเตรียมปฏิทินเพื่อโทรนัดสำรวจความแข็งแรงของหลังคาและระบบไฟที่บ้านคุณหน้างานจริง เพื่อประเมินปรับปรุงใบเสนอราคาทางการให้อย่างปลอดภัยสูงสุด
                </p>
              </div>
              <div className="border-t border-slate-200/60 pt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-bold text-slate-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>ระบบได้รับการคุ้มครองสิทธิ์</span>
                </div>
                <div className="hidden sm:block text-slate-300">|</div>
                <div>
                  <span>Project ID: {orderId.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Subcase 2.2: WAITING_SIGNATURE (Map, signature canvas, document uploads) */}
          {isWaitingSignature && (
            <div className="space-y-8">
              
              {/* 1. Live Dynamic Quote Materials Card */}
              <div className="solar-route-card rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 bg-[#F5F2EB]/50 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#2C486A]" />
                    <span>ใบเสนอราคาและรายการพัสดุจัดซื้อ (Live Adjusted Quote)</span>
                  </h3>
                  {systemSizeKwp && panelCount && (
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
                      Solar System Size: {systemSizeKwp.toFixed(2)} kWp • Panels count: {panelCount} modules
                    </p>
                  )}
                </div>
                <div className="p-6 divide-y divide-slate-100">
                  {configurationData?.items && Array.isArray(configurationData.items) && configurationData.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[680px] w-full text-left text-xs font-semibold text-slate-700">
                        <thead>
                          <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-100 pb-2">
                            <th className="py-2">รายการอุปกรณ์ (Equipment Name)</th>
                            <th className="py-2 text-center">จำนวน (Qty)</th>
                            <th className="py-2 text-right">ราคาต่อหน่วย (Price)</th>
                            <th className="py-2 text-right">ราคารวม (Total)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {configurationData.items.map((item, idx) => {
                            const name = typeof item.productName === "string"
                              ? item.productName
                              : typeof item.model === "string"
                                ? item.model
                                : typeof item.name === "string"
                                  ? item.name
                                  : "Solar Equipment";
                            const qty = typeof item.quantity === "number"
                              ? item.quantity
                              : typeof item.qty === "number"
                                ? item.qty
                                : 1;
                            const priceValue = typeof item.unitPrice === "number"
                              ? item.unitPrice
                              : typeof item.price === "number"
                                ? item.price
                                : null;
                            const price = toPositiveAmount(priceValue);
                            const itemKey = typeof item.id === "string" && item.id.trim()
                              ? item.id
                              : typeof item.productId === "string" && item.productId.trim()
                                ? item.productId
                                : `${name}-${idx}`;
                            return (
                              <tr key={itemKey} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 font-bold text-slate-800 pr-4">{name}</td>
                                <td className="py-3 text-center font-mono">{qty}</td>
                                <td className="py-3 text-right font-mono">{formatMoney(price)}</td>
                                <td className="py-3 text-right font-mono font-bold text-slate-900">{formatMoney(price === null ? null : price * qty)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-slate-500 py-4 italic text-center">
                      ไม่มีรายละเอียดรายการวัสดุที่ต้องแสดง
                    </p>
                  )}

                  <div className="pt-4 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      * ราคาที่แสดงผ่านการปรับปรุงสภาพหลังคาหน้างานเรียบร้อยแล้ว
                    </span>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">ยอดงวดรวมจัดจ้างโครงการ (Grand Total)</span>
                      <h4 className="text-2xl font-black text-[#D8A87B] font-mono tracking-tight mt-0.5">
                        {formatMoney(activeAmount)}
                      </h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Interactive Map Picker */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="p-1.5 rounded-lg bg-[#B7D1EA]/30 text-[#2C486A]">
                    <Map className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      1. ปักหมุดพิกัดตำแหน่งการติดตั้ง (Pin Installation Location) <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      ค้นหาบ้านของคุณ ย้ายหมุดไปตรงจุดวางแผงโซลาร์เซลล์บนหลังคาจริงเพื่อให้วิศวกรยืนยัน
                    </p>
                  </div>
                </div>
                <InstallationMapPicker
                  latitude={mapLatitude}
                  longitude={mapLongitude}
                  address={mapAddress}
                  notes={mapNotes}
                  onChange={({ latitude, longitude, address }) => {
                    setMapLatitude(latitude);
                    setMapLongitude(longitude);
                    setMapAddress(address);
                  }}
                  onNotesChange={(notes) => setMapNotes(notes)}
                />
              </div>

              {/* 3. E-Sign Canvas */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#B7D1EA]/30 text-[#2C486A]">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 uppercase">
                        2. ลงนามสัญญาจัดจ้างแบบดิจิทัล (Digital E-Signature) <span className="text-red-500">*</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        วาดลายเซ็นรับรองแบบสัญญาโครงการติดตั้งลงในกรอบด้านล่าง
                      </p>
                    </div>
                  </div>
                  {hasSigned && (
                    <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase text-emerald-700 tracking-wider">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>ลงนามแล้ว</span>
                    </span>
                  )}
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  <div className="border border-slate-300 rounded-2xl overflow-hidden bg-slate-50/50 shadow-inner">
                    <SignatureCanvas
                      ref={sigCanvasRef}
                      onEnd={() => setHasSigned(true)}
                      canvasProps={{
                        className: "h-40 w-full touch-none cursor-crosshair bg-white",
                      }}
                      penColor="#0F172A"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        sigCanvasRef.current?.clear();
                        setHasSigned(false);
                      }}
                      className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 rounded-xl text-[10px] font-black text-slate-650 uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>ล้างลายมือชื่อ (Clear)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Documents Uploads */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="p-1.5 rounded-lg bg-[#B7D1EA]/30 text-[#2C486A]">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      3. เอกสารประกอบสัญญาจัดจ้าง (Required Documents) <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      อัปโหลดสำเนาเอกสารเพื่อยืนยันความเป็นเจ้าของกรรมสิทธิ์หน้างานและจดทะเบียนขนานไฟ
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ID Card Box */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      สำเนาบัตรประชาชน (Copy of ID Card)
                    </label>
                    
                    {!idCardPreview ? (
                      <div className="relative flex flex-col items-center justify-center w-full min-h-[140px] border-2 border-dashed border-slate-300 hover:border-[#B7D1EA] bg-slate-50/30 rounded-2xl cursor-pointer transition-colors p-4">
                        <label className="flex flex-col items-center justify-center w-full h-full text-center cursor-pointer">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-bold text-slate-800">คลิกเพื่ออัปโหลดสำเนาบัตรประชาชน</span>
                          <span className="text-[9px] text-slate-450 mt-1 uppercase font-bold tracking-wider">JPG, PNG, WEBP (ไม่เกิน 5MB)</span>
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            onChange={(e) => handleDocUpload("idcard", e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="relative aspect-[3/2] border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden shadow-2xs">
                        <ProgressiveImage
                          src={idCardPreview}
                          alt="ID card preview"
                          fill
                          sizes="(max-width: 768px) 100vw, 360px"
                          className="object-contain p-2"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeDoc("idcard")}
                          className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/85 text-white p-1.5 rounded-full shadow transition-all hover:scale-105"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Electricity Bill Box */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      บิลค่าไฟฟ้าเดือนล่าสุด (Recent Electricity Bill)
                    </label>
                    
                    {!billPreview ? (
                      <div className="relative flex flex-col items-center justify-center w-full min-h-[140px] border-2 border-dashed border-slate-300 hover:border-[#B7D1EA] bg-slate-50/30 rounded-2xl cursor-pointer transition-colors p-4">
                        <label className="flex flex-col items-center justify-center w-full h-full text-center cursor-pointer">
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs font-bold text-slate-800">คลิกเพื่ออัปโหลดบิลค่าไฟ</span>
                          <span className="text-[9px] text-slate-450 mt-1 uppercase font-bold tracking-wider">JPG, PNG, WEBP (ไม่เกิน 5MB)</span>
                          <input
                            type="file"
                            accept="image/jpeg, image/png, image/webp"
                            onChange={(e) => handleDocUpload("bill", e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="relative aspect-[3/2] border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden shadow-2xs">
                        <ProgressiveImage
                          src={billPreview}
                          alt="Electricity bill preview"
                          fill
                          sizes="(max-width: 768px) 100vw, 360px"
                          className="object-contain p-2"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => removeDoc("bill")}
                          className="absolute top-2.5 right-2.5 bg-black/60 hover:bg-black/85 text-white p-1.5 rounded-full shadow transition-all hover:scale-105"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit contract form triggers transition to MILESTONE_1_ACTIVE */}
              <div className="bg-[#F5F2EB] rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900 uppercase">
                    ลงนามและยินยอมตามเงื่อนไขทางวิศวกรรม
                  </h4>
                  <p className="text-xs text-slate-650 font-semibold max-w-xl">
                    ข้อมูลลายมือชื่อ แผนที่พิกัด และเอกสารจะถูกบันทึกอย่างปลอดภัยเพื่อยื่นแบบโครงการโซลาร์เซลล์ของท่านให้เสร็จสิ้นตามมาตรฐานวิศวกรรมการก่อสร้าง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitContract}
                  disabled={!mapLatitude || !hasSigned || !idCardFile || !billFile || isPending || isUploading}
                  className="w-full sm:w-auto bg-[#B7D1EA] hover:bg-[#a5c2de] disabled:bg-slate-200 text-slate-900 disabled:text-slate-400 px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95 disabled:scale-100 disabled:pointer-events-none"
                >
                  <Check className="w-4 h-4 text-slate-900" />
                  <span>ลงนามอนุมัติสัญญา (Sign & Agree to Contract)</span>
                </button>
              </div>

            </div>
          )}

          {/* Subcase 2.3: MILESTONE_1_ACTIVE or newer (Vertical timeline stepper with active QR and uploads blocked for future steps) */}
          {isMilestoneActive && (
            <div className="relative pl-6 sm:pl-8 space-y-12 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
              {milestones.map((milestone) => {
                const isPaid = milestone.status === "PAID";
                const isActive = milestone.status === "ACTIVE";
                const isPending = milestone.status === "PENDING";

                // Step status icons
                let stepMarker = null;
                if (isPaid) {
                  stepMarker = (
                    <div className="absolute -left-2.5 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white ring-4 ring-emerald-100">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  );
                } else if (isActive) {
                  stepMarker = (
                    <GsapPulse className="absolute -left-2.5 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#B7D1EA] text-[#2C486A] border-2 border-white ring-4 ring-blue-100" scale={1.08}>
                      <div className="w-1.5 h-1.5 bg-[#2C486A] rounded-full" />
                    </GsapPulse>
                  );
                } else {
                  stepMarker = (
                    <div className="absolute -left-2.5 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-400 border-2 border-white ring-2 ring-slate-100">
                      <Lock className="w-3 h-3" />
                    </div>
                  );
                }

                return (
                  <div key={milestone.id} className="relative space-y-4">
                    {stepMarker}

                    <div
                      className={`solar-route-card rounded-[2rem] border transition-all ${
                        isPaid
                          ? "border-slate-200 bg-[#F0EEE9]/15 opacity-85"
                          : isActive
                          ? "border-[#B7D1EA] bg-white shadow-sm ring-1 ring-[#B7D1EA]/25"
                          : "border-slate-250/60 bg-slate-50/50 opacity-60 pointer-events-none"
                      }`}
                    >
                      {/* Stepper details */}
                      <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#2C486A]">
                              งวดที่ {milestone.milestoneOrder} ({milestone.percentage}%)
                            </span>
                            {isPaid && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                                ชำระแล้ว
                              </span>
                            )}
                            {isActive && (
                              <GsapPulse className="px-2 py-0.5 rounded-full bg-[#B7D1EA]/20 border border-[#B7D1EA]/30 text-[#2C486A] text-[9px] font-black uppercase tracking-wider">
                                รอการชำระเงิน
                              </GsapPulse>
                            )}
                            {isPending && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5 font-mono">
                                <LockKeyhole className="w-2.5 h-2.5" /> {t("locked")}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-black text-slate-900 font-sans">
                            {milestone.milestoneName}
                          </h3>
                          {isPaid && milestone.paidAt && (
                            <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              ชำระเมื่อ: {formatDateTime(milestone.paidAt)}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                            {formatMoney(Number(milestone.amount))}
                          </p>
                          {isPaid && milestone.verifiedSlip && (
                            <a
                              href={milestone.verifiedSlip.slipImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#2C486A] hover:underline mt-1.5"
                            >
                              ดูสลิปโอนเงิน <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Display QR & upload logic only on the currently active step */}
                      {isActive && !activePaymentRequest && (
                        <div className="p-6 sm:p-8 bg-[#F5F2EB]/30 rounded-b-[2rem] grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                          {/* QR */}
                          <div className="space-y-4 text-center bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs">
                            {promptpayPayload ? (
                              <div className="bg-[#F0EEE9]/30 p-4 rounded-2xl border border-slate-200/60 max-w-xs mx-auto flex items-center justify-center">
                                <QRCodeSVG value={promptpayPayload} size={200} includeMargin />
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-800">
                                ระบบชำระเงินยังไม่ได้ตั้งค่า PromptPay กรุณาติดต่อทีมงานเพื่อรับช่องทางชำระเงิน
                              </div>
                            )}
                            <div className="space-y-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#2C486A]">
                                ยอดชำระงวดที่ {milestone.milestoneOrder}
                              </p>
                              <h4 className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                                {formatMoney(activeAmount)}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                กรุณาสแกนคิวอาร์โค้ดด้านบนด้วยแอปพลิเคชันธนาคาร
                              </p>
                            </div>
                          </div>

                          {/* Bank slip uploader */}
                          <div className="space-y-6 flex flex-col justify-between min-h-[300px]">
                            <div className="space-y-4">
                              {!previewUrl ? (
                                <div
                                  onDragEnter={handleDrag}
                                  onDragOver={handleDrag}
                                  onDragLeave={handleDrag}
                                  onDrop={handleDrop}
                                  className={`relative flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed rounded-3xl cursor-pointer transition-all ${
                                    dragActive
                                      ? "border-[#B7D1EA] bg-[#B7D1EA]/5 scale-[1.01]"
                                      : "border-slate-300 hover:border-[#B7D1EA] bg-white hover:bg-slate-50/50"
                                  }`}
                                >
                                  <label className="flex flex-col items-center justify-center w-full h-full text-center px-4 cursor-pointer">
                                    <Upload className={`w-10 h-10 mb-3 transition-colors ${dragActive ? "text-[#2C486A]" : "text-slate-400"}`} />
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                      ลากไฟล์สลิปมาวาง หรือ คลิกเพื่ออัปโหลด
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                                      รองรับไฟล์ JPG, PNG, WEBP เท่านั้น (ไม่เกิน 12MB)
                                    </p>
                                    <input
                                      type="file"
                                      accept="image/jpeg, image/png, image/webp"
                                      onChange={handleFileChange}
                                      className="hidden"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="relative aspect-video rounded-3xl overflow-hidden border border-slate-300 shadow-md bg-slate-950/5">
                                  <ProgressiveImage
                                    src={previewUrl}
                                    alt="Payment Slip Preview"
                                    fill
                                    sizes="(max-width: 768px) 100vw, 640px"
                                    className="object-contain p-2"
                                    unoptimized
                                  />
                                  <button
                                    type="button"
                                    onClick={handleRemoveFile}
                                    className="absolute top-3 right-3 bg-black/60 hover:bg-black/85 text-white p-2 rounded-full transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              <div className="bg-[#B7D1EA]/10 border border-[#B7D1EA]/30 rounded-2xl p-4 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
                                <div className="text-[11px] font-semibold text-[#2C486A] leading-relaxed">
                                  <p className="font-black text-slate-900 mb-0.5">การตรวจสอบสลิป</p>
                                  กรุณาตรวจสอบจำนวนเงินและงวดงานให้ถูกต้องตรงตามคิวอาร์โค้ดก่อนทำการยืนยัน สลิปจะถูกบันทึกเพื่อตรวจสอบโดยฝ่ายบัญชีอย่างเป็นทางการ
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={handleVerifyPayment}
                                disabled={!file || isUploading || !activeMilestone}
                                className="w-full bg-[#B7D1EA] hover:bg-[#a5c2de] disabled:bg-slate-200 text-slate-900 disabled:text-slate-400 py-4 rounded-2xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer active:scale-[0.99] hover:scale-[1.01]"
                              >
                                <span>ยืนยันการชำระเงิน (Verify Payment)</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {isActive && activePaymentRequest && (
                        <div className="p-6 sm:p-8 bg-[#F5F2EB]/30 rounded-b-[2rem] text-center border-t border-slate-100 flex flex-col items-center justify-center gap-2">
                          <LockKeyhole className="w-6 h-6 text-slate-400" />
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            งวดงานนี้ถูกระงับเพื่อรอชำระเงินตามคำขอชำระเงินพิเศษ/เงินมัดจำด้านบน
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold max-w-md">
                            หลังจากคุณชำระเงินมัดจำเสร็จสิ้นและได้รับการยืนยันแล้ว ระบบจะเริ่มดำเนินการต่อโดยอัตโนมัติ
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </GsapReveal>
  );
}

function GsapSlowRotate({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set(element, { rotate: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.to(element, {
        rotate: 360,
        duration: 8,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
    }, element);

    return () => context.revert();
  }, []);

  return (
    <span ref={ref} className="inline-flex">
      {children}
    </span>
  );
}

function GsapSuccessOverlay({ children }: { children: ReactNode }) {
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set(overlay, { autoAlpha: 1, x: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        overlay,
        { autoAlpha: 0, x: 36 },
        { autoAlpha: 1, x: 0, duration: 0.35, ease: "power2.out" },
      );
    }, overlay);

    return () => context.revert();
  }, []);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#F5F2EB] px-6"
    >
      {children}
    </div>
  );
}
