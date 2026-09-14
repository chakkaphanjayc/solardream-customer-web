"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  CheckCircle2,
  FileImage,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildPromptPayPayload } from "@/lib/promptpay";
import { cn } from "@/lib/utils";
import { trackProductEvent } from "@/lib/productAnalytics";

type Booking = {
  orderId: string;
  serviceRequestId: string | null;
  trackingId: string;
  price: number;
  currency: string;
};

type PaymentPhase = "ready" | "verifying" | "verified" | "paid" | "pending";
type StatusPayload = {
  success?: boolean;
  paymentStatus?: string;
  erpSyncStatus?: string;
  error?: string;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png"]);

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) =>
    window.setTimeout(resolve, milliseconds),
  );
}

export default function ServiceCheckout({
  booking,
  serviceName,
  locale,
  close,
}: {
  booking: Booking;
  serviceName: string;
  locale: string;
  close: () => void;
}) {
  const t = useTranslations("ServicesPage");
  const inputRef = useRef<HTMLInputElement>(null);
  const attemptKeyRef = useRef(crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<PaymentPhase>("ready");
  const [erpStatus, setErpStatus] = useState("PENDING");
  const [error, setError] = useState("");

  const amount = useMemo(
    () =>
      new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
        style: "currency",
        currency: booking.currency || "THB",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(booking.price),
    [booking.currency, booking.price, locale],
  );
  const promptPayPayload = useMemo(
    () => buildPromptPayPayload(booking.price),
    [booking.price],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    void trackProductEvent("service_checkout_started", {
      payment_surface: "service_checkout",
    });
  }, [booking.orderId]);

  useEffect(() => {
    if (phase !== "paid") return;
    void trackProductEvent("service_payment_confirmed", {
      payment_surface: "service_checkout",
    });
  }, [phase]);

  const selectFile = (nextFile: File | undefined) => {
    setError("");
    if (!nextFile) return;
    if (!ACCEPTED_TYPES.has(nextFile.type)) {
      setError(t("payment.errors.type"));
      return;
    }
    if (nextFile.size > MAX_FILE_BYTES) {
      setError(t("payment.errors.size"));
      return;
    }
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    attemptKeyRef.current = crypto.randomUUID();
    void trackProductEvent("service_payment_slip_selected", {
      payment_surface: "service_checkout",
    });
  };

  const clearFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
    attemptKeyRef.current = crypto.randomUUID();
  };

  const fetchStatus = async () => {
    const response = await fetch(
      `/api/services/orders/${booking.orderId}/payment-slip`,
      { cache: "no-store" },
    );
    const payload = (await readJson(response)) as StatusPayload;
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || t("payment.errors.status"));
    }
    setErpStatus(payload.erpSyncStatus || "PENDING");
    if (
      payload.paymentStatus === "PAID" &&
      payload.erpSyncStatus === "SYNCED"
    ) {
      setPhase("paid");
      return true;
    }
    if (
      payload.paymentStatus === "VERIFIED" &&
      payload.erpSyncStatus === "FAILED"
    ) {
      setPhase("pending");
      setError(t("payment.errors.erpFailed"));
      return true;
    }
    setPhase("verified");
    return false;
  };

  const pollUntilPaid = async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (attempt > 0) await wait(1_500);
      if (await fetchStatus()) return;
    }
    setPhase("pending");
  };

  const verifyPayment = async () => {
    if (!file || phase === "verifying") return;
    setError("");
    setPhase("verifying");
    try {
      const form = new FormData();
      form.set("image", file, file.name);
      const response = await fetch(
        `/api/services/orders/${booking.orderId}/payment-slip`,
        {
          method: "POST",
          headers: { "Idempotency-Key": attemptKeyRef.current },
          body: form,
        },
      );
      const payload = await readJson(response);
      if (!response.ok || payload.success !== true) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : t("payment.errors.upload"),
        );
      }
      setPhase("verified");
      void trackProductEvent("service_payment_slip_uploaded", {
        payment_surface: "service_checkout",
      });
      await pollUntilPaid();
    } catch (caught) {
      setPhase("ready");
      setError(
        caught instanceof Error ? caught.message : t("payment.errors.upload"),
      );
    }
  };

  const retryStatus = async () => {
    setError("");
    setPhase("verified");
    try {
      await pollUntilPaid();
    } catch (caught) {
      setPhase("pending");
      setError(
        caught instanceof Error ? caught.message : t("payment.errors.status"),
      );
    }
  };

  if (phase === "paid") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-6 sm:p-10">
        <div className="mx-auto max-w-xl text-center">
          <div className="relative mx-auto h-40 w-44" aria-hidden="true">
            <Image
              src="/asset/solia-greeting.webp"
              alt=""
              fill
              sizes="176px"
              className="object-contain"
            />
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-4 py-2 text-xs font-black text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            {t("payment.paidEyebrow")}
          </span>
          <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {t("payment.paidTitle")}
          </h3>
          <p className="mt-3 font-semibold leading-7 text-slate-600">
            {t("payment.paidDescription", { service: serviceName })}
          </p>
          <p className="mt-3 rounded-xl bg-[#B7D1EA]/25 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
            {t("payment.trackingEmailNotice")}
          </p>
          <Ticket booking={booking} amount={amount} />
          <Button type="button" onClick={close} size="lg" className="mt-6">
            {t("done")}
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "verifying" || phase === "verified" || phase === "pending") {
    const pending = phase === "pending";
    return (
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-6 sm:p-10">
        <div className="mx-auto flex min-h-[430px] max-w-xl flex-col items-center justify-center text-center">
          <div className="relative h-36 w-40" aria-hidden="true">
            <Image
              src="/asset/solia-thinking.webp"
              alt=""
              fill
              sizes="160px"
              className="object-contain"
            />
          </div>
          {pending ? (
            <RefreshCw className="mt-3 h-9 w-9 text-[#0D9488]" />
          ) : phase === "verified" ? (
            <span className="mt-3 rounded-full bg-emerald-100 p-3 text-emerald-700">
              <Check className="h-7 w-7" />
            </span>
          ) : (
            <RefreshCw className="mt-3 h-9 w-9 text-[#0D9488] motion-safe:animate-spin" />
          )}
          <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
            {pending
              ? t("payment.pendingTitle")
              : phase === "verified"
                ? t("payment.bankVerified")
                : t("payment.verifying")}
          </h3>
          <p className="mt-3 max-w-md font-semibold leading-7 text-slate-600">
            {pending
              ? t("payment.pendingDescription")
              : phase === "verified"
                ? t("payment.erpSyncing", { status: erpStatus })
                : t("payment.verifyingDescription")}
          </p>
          {phase === "verified" ? (
            <p className="mt-3 rounded-xl bg-[#B7D1EA]/25 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
              {t("payment.trackingEmailNotice")}
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-rose-50/90 px-4 py-3 text-sm font-bold text-rose-700"
            >
              {error}
            </p>
          ) : null}
          {pending ? (
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={retryStatus} size="lg">
                {t("payment.retryStatus")}
              </Button>
              <Button type="button" onClick={close} size="lg" variant="outline">
                {t("done")}
              </Button>
            </div>
          ) : null}
          <p className="sr-only" role="status" aria-live="polite">
            {phase === "verifying"
              ? t("payment.verifying")
              : t("payment.erpSyncing", { status: erpStatus })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto bg-[#F0EEE9] lg:grid-cols-2">
      <section className="border-b border-[#8E8B83]/15 bg-[#E6E3DC] p-6 sm:p-8 lg:border-b-0 lg:border-r">
        <p className="text-sm font-medium text-[#4F7FA8]">
          {t("payment.stepOne")}
        </p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1C1A]">
          {t("payment.scanTitle")}
        </h3>
        <Card className="mx-auto mt-6 grid w-fit place-items-center rounded-[28px] border border-[#8E8B83]/20 bg-[#F0EEE9] p-6 shadow-sm">
          {promptPayPayload ? (
            <QRCodeSVG
              value={promptPayPayload}
              size={220}
              level="M"
              marginSize={1}
              role="img"
              aria-label={t("payment.qrLabel", { amount })}
              className="h-auto max-w-full"
            />
          ) : (
            <div
              role="alert"
              className="grid h-[220px] w-[220px] max-w-full place-items-center p-6 text-center text-sm font-medium text-rose-700"
            >
              {t("payment.errors.qr")}
            </div>
          )}
        </Card>
        <Card className="mx-auto mt-5 max-w-sm rounded-[24px] border border-[#8E8B83]/20 bg-[#F0EEE9] p-5 text-center shadow-sm">
          <p className="text-sm font-medium text-[#4E4B44]">
            {t("payment.exactAmount")}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#4F7FA8]">
            {amount}
          </p>
          <p className="mt-2 text-xs font-normal leading-5 text-[#4E4B44]">
            {t("payment.amountLocked")}
          </p>
        </Card>
      </section>

      <section className="bg-[#F0EEE9] p-6 sm:p-8">
        <p className="text-sm font-medium text-[#4F7FA8]">
          {t("payment.stepTwo")}
        </p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-[#1C1C1A]">
          {t("payment.uploadTitle")}
        </h3>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={(event) => selectFile(event.target.files?.[0])}
          className="sr-only"
          id={`service-slip-${booking.orderId}`}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragActive(false)}
          onDrop={(event: DragEvent<HTMLButtonElement>) => {
            event.preventDefault();
            setDragActive(false);
            selectFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-5 flex min-h-52 w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed bg-[#E6E3DC] p-6 text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D1EA] focus-visible:ring-offset-2",
            dragActive
              ? "border-[#7CA8D0] bg-[#DCE8F5]/40"
              : "border-[#8E8B83]/30 hover:border-[#7CA8D0]",
          )}
        >
          {previewUrl ? (
            <span className="relative block h-32 w-full overflow-hidden rounded-2xl">
              <Image
                src={previewUrl}
                alt=""
                fill
                unoptimized
                className="object-contain"
              />
            </span>
          ) : (
            <span className="relative block h-20 w-24" aria-hidden="true">
              <Image
                src="/asset/solia-thinking.webp"
                alt=""
                fill
                sizes="96px"
                className="object-contain"
              />
              <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-[#B7D1EA] text-white shadow-sm">
                <Upload className="h-4 w-4" />
              </span>
            </span>
          )}
          <span className="mt-4 text-sm font-medium text-[#1C1C1A]">
            {file ? file.name : t("payment.dropzone")}
          </span>
          <span className="mt-1 text-xs font-normal text-[#4E4B44]">
            {t("payment.fileRules")}
          </span>
        </button>
        {file ? (
          <Button
            type="button"
            onClick={clearFile}
            variant="quiet"
            className="mt-3 rounded-full hover:bg-[#A5C2DE]/10 text-[#4E4B44]"
          >
            <X className="h-4 w-4" /> {t("payment.clear")}
          </Button>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-2xl bg-rose-50/90 p-3 text-sm font-medium text-rose-700 border border-rose-200/60"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-5 rounded-2xl bg-[#DCE8F5] p-3 text-xs font-medium leading-5 text-[#2E2C27]">
          <ShieldCheck className="mr-2 inline h-4 w-4 text-[#4F7FA8]" />
          {t("payment.secureNotice")}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            onClick={close}
            size="lg"
            variant="outline"
            className="rounded-full border-[#8E8B83]/30 text-[#4E4B44] hover:bg-[#A5C2DE]/10 hover:text-[#3E6685] active:scale-95"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={verifyPayment}
            disabled={!file || !promptPayPayload}
            size="lg"
            className="rounded-full bg-[#B7D1EA] text-white hover:bg-[#A5C2DE]/90 active:scale-95 shadow-sm"
          >
            <FileImage className="mr-2 inline h-4 w-4" />
            {t("payment.verify")}
          </Button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {file ? file.name : ""}
        </p>
      </section>
    </div>
  );
}

function Ticket({ booking, amount }: { booking: Booking; amount: string }) {
  const t = useTranslations("ServicesPage");
  return (
    <Card className="mt-6 rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 text-left shadow-sm">
      <p className="text-sm font-medium text-[#4E4B44]">{t("trackingId")}</p>
      <p className="mt-2 break-all font-mono text-sm font-bold text-[#1C1C1A]">
        {booking.trackingId}
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-[#8E8B83]/15 pt-4 text-sm">
        <span className="font-medium text-[#4E4B44]">{t("confirmedPrice")}</span>
        <span className="font-bold text-[#4F7FA8]">{amount}</span>
      </div>
    </Card>
  );
}
