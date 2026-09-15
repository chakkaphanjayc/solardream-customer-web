import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, Lock, Activity } from "@/components/ui/icons";
import { eq, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { consultationLeads, proposals, serviceOrders } from "@/db/schema";
import { normalizeTrackingReference } from "@/lib/trackingReference";
import { cn } from "@/lib/utils";
import PublicMagicLinkForm from "./PublicMagicLinkForm";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";

interface PublicTrackerPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}


function referenceWithoutKnownPrefix(value: string) {
  return value
    .trim()
    .replace(/^(QT|QTN|TRK|REF)-/i, "")
    .trim();
}

function proposalReferenceConditions(reference: string) {
  const cleanReference = normalizeTrackingReference(reference);
  const shortReference = referenceWithoutKnownPrefix(cleanReference);
  const conditions = [
    eq(proposals.id, cleanReference),
    eq(proposals.erpnextQuotationId, cleanReference),
    eq(proposals.magicTokenSlug, cleanReference),
    sql`${proposals.configurationData}->>'trackingRef' = ${cleanReference}`,
    sql`${proposals.configurationData}->>'trackingId' = ${cleanReference}`,
    sql`${proposals.configurationData}->>'orderReference' = ${cleanReference}`,
    sql`('SD-QT-' || upper(substr(translate(replace(${proposals.id}::text, '-', ''), '01ILO', '23444'), 1, 6))) = ${cleanReference}`,
  ];

  if (/^[a-z0-9]{6,16}$/i.test(shortReference)) {
    conditions.push(
      sql`upper(substring(${proposals.id}::text from 1 for ${shortReference.length})) = ${shortReference.toUpperCase()}`,
    );
  }

  return conditions;
}

function consultationLeadReferenceConditions(reference: string) {
  const cleanReference = normalizeTrackingReference(reference);
  const shortReference = referenceWithoutKnownPrefix(cleanReference);
  const conditions = [
    eq(consultationLeads.id, cleanReference),
    sql`${consultationLeads.rawPayload}->>'trackingRef' = ${cleanReference}`,
    sql`${consultationLeads.rawPayload}->>'trackingId' = ${cleanReference}`,
    sql`${consultationLeads.dynamicCalculations}->>'trackingRef' = ${cleanReference}`,
    sql`('SD-QT-' || upper(substr(translate(replace(${consultationLeads.id}::text, '-', ''), '01ILO', '23444'), 1, 6))) = ${cleanReference}`,
  ];

  if (/^[a-z0-9]{6,16}$/i.test(shortReference)) {
    conditions.push(
      sql`upper(substring(${consultationLeads.id}::text from 1 for ${shortReference.length})) = ${shortReference.toUpperCase()}`,
    );
  }

  return conditions;
}

export default async function PublicTrackerPage({ params }: PublicTrackerPageProps) {
  const { id: trackingId, locale } = await params;
  if (!trackingId) {
    notFound();
  }

  const cleanRef = normalizeTrackingReference(trackingId);

  // 1. Try to find matching service order
  const serviceOrder = await db.query.serviceOrders.findFirst({
    where: eq(serviceOrders.trackingRef, cleanRef),
  });

  let milestones: { label: string; labelTh: string; status: "completed" | "active" | "upcoming" }[] = [];
  let type: "SERVICE_ORDER" | "QUOTATION" | "CONSULTATION_LEAD" = "QUOTATION";

  if (serviceOrder) {
    type = "SERVICE_ORDER";
    const isCompletedStep2 = serviceOrder.erpPaymentSyncStatus === "SYNCED" || ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CLOSED"].includes(serviceOrder.status.toUpperCase());
    const isCompletedStep3 = ["COMPLETED", "CLOSED"].includes(serviceOrder.status.toUpperCase());
    const isCompletedStep4 = ["COMPLETED", "CLOSED"].includes(serviceOrder.status.toUpperCase());

    let step1Status: "completed" | "active" | "upcoming" = "completed";
    let step2Status: "completed" | "active" | "upcoming" = "upcoming";
    let step3Status: "completed" | "active" | "upcoming" = "upcoming";
    let step4Status: "completed" | "active" | "upcoming" = "upcoming";

    if (isCompletedStep4) {
      step1Status = "completed";
      step2Status = "completed";
      step3Status = "completed";
      step4Status = "completed";
    } else if (isCompletedStep3) {
      step1Status = "completed";
      step2Status = "completed";
      step3Status = "completed";
      step4Status = "active";
    } else if (isCompletedStep2) {
      step1Status = "completed";
      step2Status = "completed";
      step3Status = "active";
      step4Status = "upcoming";
    } else {
      step1Status = "completed";
      step2Status = "active";
      step3Status = "upcoming";
      step4Status = "upcoming";
    }

    milestones = [
      {
        label: "Requirement Captured",
        labelTh: "ดึงข้อมูลเทคนิคเรียบร้อย",
        status: step1Status,
      },
      {
        label: "Pending Approval",
        labelTh: "รอเจ้าหน้าที่ลงนามอนุมัติ",
        status: step2Status,
      },
      {
        label: "Customer Review",
        labelTh: "ลูกค้าพิจารณาเอกสารและลงนาม",
        status: step3Status,
      },
      {
        label: "Project Approved",
        labelTh: "โครงการผ่านการอนุมัติสมบูรณ์",
        status: step4Status,
      },
    ];
  } else {
    // 2. Try to find matching proposal
    const proposal = await db.query.proposals.findFirst({
      where: or(...proposalReferenceConditions(cleanRef)),
    });

    if (proposal) {
      type = "QUOTATION";
      const isCompletedStep2 = ["SIGNED", "CONFIRMED", "PAID", "COMPLETED"].includes(proposal.status.toUpperCase());
      const isCompletedStep3 = ["PAID", "COMPLETED"].includes(proposal.status.toUpperCase());
      const isCompletedStep4 = ["PAID", "COMPLETED"].includes(proposal.status.toUpperCase());

      let step1Status: "completed" | "active" | "upcoming" = "completed";
      let step2Status: "completed" | "active" | "upcoming" = "upcoming";
      let step3Status: "completed" | "active" | "upcoming" = "upcoming";
      let step4Status: "completed" | "active" | "upcoming" = "upcoming";

      if (isCompletedStep4) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "completed";
      } else if (isCompletedStep3) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "active";
      } else if (isCompletedStep2) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "active";
        step4Status = "upcoming";
      } else {
        step1Status = "completed";
        step2Status = "active";
        step3Status = "upcoming";
        step4Status = "upcoming";
      }

      milestones = [
        {
          label: "Requirement Captured",
          labelTh: "ดึงข้อมูลเทคนิคเรียบร้อย",
          status: step1Status,
        },
        {
          label: "Pending Approval",
          labelTh: "รอเจ้าหน้าที่ลงนามอนุมัติ",
          status: step2Status,
        },
        {
          label: "Customer Review",
          labelTh: "ลูกค้าพิจารณาเอกสารและลงนาม",
          status: step3Status,
        },
        {
          label: "Project Approved",
          labelTh: "โครงการผ่านการอนุมัติสมบูรณ์",
          status: step4Status,
        },
      ];
    } else {
      // 3. Try to find matching consultation lead
      const consultationLead = await db.query.consultationLeads.findFirst({
        where: or(...consultationLeadReferenceConditions(cleanRef)),
      });

      if (!consultationLead) {
        notFound();
      }

      type = "CONSULTATION_LEAD";
      const cStatus = (consultationLead.status || "NEW_LEAD").toUpperCase();
      const isCompletedStep2 = ["IN_PROGRESS", "REVIEW", "APPROVED", "COMPLETED"].includes(cStatus);
      const isCompletedStep3 = ["APPROVED", "COMPLETED"].includes(cStatus);
      const isCompletedStep4 = ["COMPLETED"].includes(cStatus);

      let step1Status: "completed" | "active" | "upcoming" = "completed";
      let step2Status: "completed" | "active" | "upcoming" = "upcoming";
      let step3Status: "completed" | "active" | "upcoming" = "upcoming";
      let step4Status: "completed" | "active" | "upcoming" = "upcoming";

      if (isCompletedStep4) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "completed";
      } else if (isCompletedStep3) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "active";
      } else if (isCompletedStep2) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "active";
        step4Status = "upcoming";
      } else {
        step1Status = "completed";
        step2Status = "active";
        step3Status = "upcoming";
        step4Status = "upcoming";
      }

      milestones = [
        {
          label: "Requirement Captured",
          labelTh: "ดึงข้อมูลเทคนิคเรียบร้อย",
          status: step1Status,
        },
        {
          label: "Engineering Review",
          labelTh: "วิศวกรประเมินและจัดเตรียมข้อเสนอ",
          status: step2Status,
        },
        {
          label: "Quotation Issuance",
          labelTh: "ออกใบเสนอราคาอย่างเป็นทางการ",
          status: step3Status,
        },
        {
          label: "Project Execution",
          labelTh: "ดำเนินการติดตั้งและส่งมอบโครงการ",
          status: step4Status,
        },
      ];
    }
  }

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const percent = Math.round((completedCount / milestones.length) * 100);
  const typeLabel = type === "SERVICE_ORDER"
    ? (locale === "th" ? "คำสั่งบริการ" : "Service order")
    : type === "CONSULTATION_LEAD"
    ? (locale === "th" ? "คำขอประเมินระบบ" : "Consultation Request")
    : (locale === "th" ? "ใบเสนอราคา" : "Quotation");

  return (
    <PageShell className="bg-[#F7F6F3] px-4 py-10 text-[#000000] sm:px-6 sm:py-14 lg:px-8 min-h-screen">
      <div className="mx-auto w-full max-w-4xl">
        <Button asChild variant="quiet" className="-ml-3 font-black text-black">
          <Link href={`/${locale}`}>
            <ArrowLeft aria-hidden="true" className="stroke-[3]" />
            {locale === "th" ? "กลับหน้าหลัก" : "Back to home"}
          </Link>
        </Button>

        <header className="mt-6 max-w-3xl">
          <p className="inline-flex rounded-xl border-2 border-black bg-white px-3.5 py-1 text-xs font-black uppercase text-[#2B9EB3] shadow-[2px_2px_0_#000000]">
            {locale === "th" ? "ติดตามความคืบหน้าคำขอ" : "Request Progress Tracking"}
          </p>
          <h1 className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-4xl uppercase text-black">
            {typeLabel} <span className="text-[#2B9EB3]">#{cleanRef}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-sm font-bold leading-6 text-slate-700 sm:text-base">
            {locale === "th"
              ? "ดูความคืบหน้าจากรหัสติดตาม โดยไม่เปิดเผยข้อมูลส่วนบุคคลหรือรายละเอียดทางการเงิน"
              : "Review progress linked to this tracking reference without exposing personal or financial details."}
          </p>
        </header>

        <section className="mt-8 overflow-hidden rounded-2xl border-2 border-[#0F172A]/30 bg-white shadow-[4px_4px_0_rgba(15,23,42,0.22)] md:grid md:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b-2 border-[#0F172A]/20 pb-4">
              <h2 className="flex items-center gap-2 text-base font-black uppercase text-black">
                <Activity aria-hidden="true" className="text-[#2B9EB3] stroke-[3]" />
                {locale === "th" ? "ขั้นตอนดำเนินงาน" : "Project milestones"}
              </h2>
              <span className="text-sm font-black text-black">{percent}%</span>
            </div>

            <div
              role="progressbar"
              aria-label={locale === "th" ? "ความคืบหน้าโครงการ" : "Project progress"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="mt-5 h-3 overflow-hidden rounded-xl border-2 border-[#0F172A]/32 bg-[#F7F6F3]"
            >
              <div
                className="h-full bg-[#D8A87B] transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>

            <ol className="mt-6 space-y-4">
              {milestones.map((step) => {
                const isPast = step.status === "completed";
                const isCurrent = step.status === "active";
                const isFuture = step.status === "upcoming";

                return (
                  <li key={step.label} className="flex items-start gap-3 rounded-xl border-2 border-[#0F172A]/25 p-3.5 bg-[#F7F6F3] shadow-[2px_2px_0_rgba(15,23,42,0.18)]">
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border-2 border-[#0F172A]/38 font-black",
                        isPast && "bg-[#4AA382] text-black shadow-[2px_2px_0_rgba(15,23,42,0.22)]",
                        isCurrent && "bg-[#D8A87B] text-black shadow-[2px_2px_0_rgba(15,23,42,0.24)]",
                        isFuture && "bg-white text-slate-400",
                      )}
                    >
                      {isPast ? (
                        <CheckCircle2 aria-hidden="true" className="stroke-[3]" />
                      ) : isCurrent ? (
                        <Clock aria-hidden="true" className="stroke-[3]" />
                      ) : (
                        <Lock aria-hidden="true" className="stroke-[3]" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          "text-sm font-black uppercase tracking-wider",
                          isFuture ? "text-slate-500" : "text-black",
                        )}
                      >
                        {locale === "th" ? step.labelTh : step.label}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-700">
                        {isPast
                          ? locale === "th" ? "เสร็จสิ้นแล้ว" : "Completed"
                          : isCurrent
                            ? locale === "th" ? "กำลังดำเนินการ" : "In progress"
                            : locale === "th" ? "ยังไม่เริ่มต้น" : "Pending"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="border-t-2 border-[#0F172A]/20 bg-[#F7F6F3] p-6 sm:p-8 md:border-l-2 md:border-t-0">
            <div className="flex size-12 items-center justify-center rounded-xl border-2 border-[#2B9EB3]/60 bg-[#2B9EB3]/20 text-[#0F172A] shadow-[2px_2px_0_rgba(43,158,179,0.24)]">
              <ShieldCheck aria-hidden="true" className="stroke-[3]" />
            </div>
            <h2 className="mt-5 text-lg font-black uppercase tracking-wider text-black">
              {locale === "th" ? "เข้าถึงพอร์ทัลแบบเต็ม" : "Open the full portal"}
            </h2>
            <p className="mt-2 text-xs font-bold leading-6 text-slate-700">
              {locale === "th"
                ? "เพื่อความเป็นส่วนตัว ข้อมูลระบบ เอกสาร และราคาจะซ่อนไว้ในหน้านี้ กรอกอีเมลที่ลงทะเบียนเพื่อรับลิงก์ที่ปลอดภัย"
                : "System details, documents, and pricing stay hidden here. Enter the registered email to receive a secure access link."}
            </p>

            <div className="mt-5 border-t-2 border-[#0F172A]/18 pt-5">
              <PublicMagicLinkForm trackingRef={cleanRef} locale={locale} />
            </div>
          </aside>
        </section>
      </div>
    </PageShell>
  );
}
