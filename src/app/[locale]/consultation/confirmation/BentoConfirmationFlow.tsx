"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clipboard,
  Check,
  Star,
  FileText,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  UserPlus,
  Activity,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { isUuidLike, deriveQuotationTrackingReference } from "@/lib/trackingReference";

interface BentoConfirmationFlowProps {
  referenceId: string;
  source: "wizard" | "build" | "services";
  locale: string;
  isMember: boolean;
}

export default function BentoConfirmationFlow({
  referenceId,
  source,
  locale = "en",
  isMember,
}: BentoConfirmationFlowProps) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const displayedReference = isUuidLike(referenceId)
    ? deriveQuotationTrackingReference(referenceId)
    : referenceId;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayedReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) return;
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/feedback/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_id: referenceId,
          rating,
          comment,
          source,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback.");
      }

      setIsSubmitted(true);
    } catch {
      setError(
        locale === "th"
          ? "ไม่สามารถส่งคำติชมได้ในขณะนี้ กรุณาลองอีกครั้งภายหลัง"
          : "Could not submit feedback at this time. Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuestionText = () => {
    if (source === "services") {
      return locale === "th"
        ? "ประสบการณ์การจองบริการของคุณในวันนี้เป็นอย่างไรบ้างคะ?"
        : "How was your experience booking our services today?";
    }
    return locale === "th"
      ? "ประสบการณ์การใช้ระบบออกแบบโซลาร์เซลล์เป็นอย่างไรบ้างคะ?"
      : "How was your experience building your solar system?";
  };

  const getRatingLabel = (score: number) => {
    const labelsEn = ["Terrible", "Poor", "Average", "Good", "Excellent"];
    const labelsTh = ["ปรับปรุงอย่างยิ่ง", "ควรปรับปรุง", "ปานกลาง", "ดีมาก", "ยอดเยี่ยม"];
    const labels = locale === "th" ? labelsTh : labelsEn;
    return labels[score - 1];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8 text-left">
      {/* CARD 1: REFERENCE NUMBER & TRACK LIVE (Spans full width) */}
      <div className="md:col-span-2 rounded-xl border-2 border-[#0F172A]/25 bg-white p-6 shadow-[3px_3px_0_rgba(15,23,42,0.22)] transition-[background-color,box-shadow] sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2B9EB3] stroke-[2.5]" />
              <p className="text-xs font-black uppercase tracking-wider text-slate-700">
                {locale === "th" ? "หมายเลขอ้างอิงและติดตามสถานะของคุณ" : "Your Tracking Reference Code"}
              </p>
            </div>
            <div className="inline-block rounded-lg border-2 border-[#0F172A]/22 bg-[#F7F6F3] px-4 py-2.5 shadow-[2px_2px_0_rgba(15,23,42,0.14)]">
              <p className="font-mono text-2xl sm:text-3xl font-black tracking-wider text-[#000000]">
                {displayedReference}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              title={locale === "th" ? "คัดลอกไปยังคลิปบอร์ด" : "Copy to Clipboard"}
              className="flex items-center gap-2 rounded-xl border-2 border-[#0F172A]/65 bg-[#D8A87B] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#0F172A] shadow-[3px_3px_0_rgba(15,23,42,0.42)] transition-[background-color,transform,box-shadow] duration-200 ease-expo hover:bg-[#C58F61] hover:shadow-[4px_4px_0_rgba(15,23,42,0.48)] active:scale-[0.985] active:shadow-[1px_1px_0_rgba(15,23,42,0.30)] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>{locale === "th" ? "คัดลอกแล้ว!" : "Copied!"}</span>
                </>
              ) : (
                <>
                  <Clipboard className="h-4 w-4 stroke-[2.5]" />
                  <span>{locale === "th" ? "คัดลอกรหัส" : "Copy Code"}</span>
                </>
              )}
            </button>

            <Link
              href={`/${locale}/track/public/${displayedReference}`}
              className="flex items-center gap-2 rounded-xl border-2 border-[#0F172A]/55 bg-[#2B9EB3] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#0F172A] shadow-[3px_3px_0_rgba(15,23,42,0.34)] transition-[background-color,transform,box-shadow] duration-200 ease-expo hover:bg-[#237f91] hover:shadow-[4px_4px_0_rgba(15,23,42,0.40)] active:scale-[0.985] active:shadow-[1px_1px_0_rgba(15,23,42,0.24)] cursor-pointer"
            >
              <Activity className="h-4 w-4 stroke-[2.5]" />
              <span>{locale === "th" ? "ติดตามสถานะสด" : "Track Live"}</span>
            </Link>
          </div>
        </div>

        {/* Info Microcopy */}
        <p className="mt-5 border-t-2 border-[#0F172A]/18 pt-4 text-xs font-semibold leading-relaxed text-slate-700">
          {locale === "th"
            ? "💡 สามารถใช้นำรหัสนี้ไปตรวจสอบสถานะการวิเคราะห์สเปกและการออกใบเสนอราคาได้ทางระบบติดตามคำขอ (Live Tracker) ได้ตลอด 24 ชั่วโมง"
            : "💡 You can use this reference code to track engineering review, sizing audit, and proposal status live on our tracking portal 24/7."}
        </p>
      </div>

      {/* CARD 2: EXPERIENCE RATING (Left column) */}
      <div className="md:col-span-1 flex flex-col justify-between rounded-xl border-2 border-[#0F172A]/25 bg-white p-6 shadow-[3px_3px_0_rgba(15,23,42,0.22)]">
        {isSubmitted ? (
          <div className="flex flex-col items-center text-center py-6 space-y-3 animate-in fade-in duration-300">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-emerald-700/38 bg-emerald-50 text-emerald-800 shadow-[2px_2px_0_rgba(16,185,129,0.22)]">
              <CheckCircle2 className="h-7 w-7 stroke-[3]" />
            </div>
            <h4 className="text-base font-black text-[#000000] uppercase tracking-wider">
              {locale === "th" ? "ขอบคุณสำหรับข้อเสนอแนะค่ะ!" : "Thank You For Your Feedback!"}
            </h4>
            <p className="text-xs font-bold text-slate-700 max-w-[260px]">
              {locale === "th"
                ? "ความคิดเห็นของคุณช่วยให้เราปรับปรุงบริการออกแบบโซลาร์ให้ดียิ่งขึ้น"
                : "Your suggestions help us deliver a better experience."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="w-full flex flex-col items-center space-y-4">
            <h4 className="text-xs font-black text-[#000000] uppercase tracking-wider text-center">
              {getQuestionText()}
            </h4>

            {/* Stars Selector Row */}
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive =
                    hoveredRating !== null ? star <= hoveredRating : rating !== null && star <= rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      className="p-1 rounded-lg transition-transform active:scale-90 hover:scale-110 cursor-pointer"
                      aria-label={`Rate ${star} star`}
                    >
                      <Star
                        className={cn(
                          "h-7 w-7 transition-colors stroke-[2]",
                          isActive
                            ? "fill-amber-400 text-black filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.3)]"
                            : "text-slate-300 fill-transparent hover:text-amber-400"
                        )}
                      />
                    </button>
                  );
                })}
              </div>

              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider min-h-4">
                {(hoveredRating !== null || rating !== null) && (
                  getRatingLabel(hoveredRating ?? rating!)
                )}
              </span>
            </div>

            {/* Smoothly Expanding Suggestions Container */}
            {rating !== null && (
              <div className="w-full space-y-3 pt-1 animate-in fade-in duration-300">
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    locale === "th"
                      ? "มีข้อเสนอแนะเพิ่มเติมเพื่อปรับปรุงบริการไหมคะ..."
                      : "Tell us what we can improve..."
                  }
                  className="w-full resize-none rounded-lg border-2 border-[#0F172A]/32 bg-[#F7F6F3] p-3 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#2B9EB3] focus:ring-2 focus:ring-[#2B9EB3]/20"
                />

                {error && (
                  <p className="rounded-lg border-2 border-rose-700/38 bg-rose-50 p-2 text-center text-xs font-semibold text-rose-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0F172A]/65 bg-[#D8A87B] py-3 text-xs font-bold uppercase tracking-wider text-[#0F172A] shadow-[3px_3px_0_rgba(15,23,42,0.42)] transition-[background-color,transform,box-shadow] hover:bg-[#C58F61] hover:shadow-[4px_4px_0_rgba(15,23,42,0.48)] active:scale-[0.985] active:shadow-[1px_1px_0_rgba(15,23,42,0.30)] disabled:cursor-wait disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin stroke-[3]" />
                  ) : (
                    locale === "th" ? "ส่งความคิดเห็น" : "Submit Rating"
                  )}
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* CARD 3: ACCOUNT & DASHBOARD (Right column) */}
      <div className="md:col-span-1 flex flex-col justify-between rounded-xl border-2 border-[#0F172A]/25 bg-white p-6 shadow-[3px_3px_0_rgba(15,23,42,0.22)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isMember ? (
              <FileText className="w-6 h-6 text-[#2B9EB3] stroke-[2.5]" />
            ) : (
              <UserPlus className="w-6 h-6 text-[#2B9EB3] stroke-[2.5]" />
            )}
            <h3 className="text-sm font-black text-[#000000] uppercase tracking-wider">
              {isMember
                ? locale === "th" ? "บันทึกคำขอไว้ในบัญชีแล้ว" : "Saved to Your Account"
                : locale === "th" ? "สมัครสมาชิกเพื่อติดตามคำขอ" : "Track Quote Status"}
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-slate-700 font-bold">
            {isMember
              ? locale === "th"
                ? "เปิดหน้าศูนย์รวมใบเสนอราคาเพื่อติดตามสถานะแบบเรียลไทม์ และตรวจสอบเอกสารเทคนิควิศวกรรม"
                : "Access your proposals dashboard to track real-time quote status and engineering documents."
              : locale === "th"
                ? "เข้าสู่ระบบหรือสมัครสมาชิกฟรี เพื่อบันทึกประวัติการออกแบบ ติดตามสถานะคำขอ และดาวน์โหลดเอกสารวิศวกรรม"
                : "Sign in or create a free account to view your saved quotes and real-time status updates."}
          </p>
        </div>

        <div className="pt-4 mt-3">
          {isMember ? (
            <Link
              href={`/${locale}/proposals`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0F172A]/80 bg-[#0F172A] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0_rgba(15,23,42,0.42)] transition-[background-color,transform,box-shadow] duration-200 ease-expo hover:bg-[#D8A87B] hover:text-[#0F172A] hover:shadow-[4px_4px_0_rgba(15,23,42,0.48)] active:scale-[0.985] active:shadow-[1px_1px_0_rgba(15,23,42,0.30)] cursor-pointer"
            >
              <span>{locale === "th" ? "ดูใบเสนอราคาของฉัน" : "View My Proposals"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>
          ) : (
            <Link
              href={`/${locale}/login?redirect=consultation/confirmation`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0F172A]/80 bg-[#0F172A] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0_rgba(15,23,42,0.42)] transition-[background-color,transform,box-shadow] duration-200 ease-expo hover:bg-[#D8A87B] hover:text-[#0F172A] hover:shadow-[4px_4px_0_rgba(15,23,42,0.48)] active:scale-[0.985] active:shadow-[1px_1px_0_rgba(15,23,42,0.30)] cursor-pointer"
            >
              <span>{locale === "th" ? "เข้าสู่ระบบ / สมัครสมาชิก" : "Sign In / Register"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
