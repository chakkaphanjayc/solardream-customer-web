import { db } from "@/db";
import { proposals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, CheckCircle2, Clock, Camera } from "@/components/ui/icons";
import { getTranslations } from "next-intl/server";
import TrackingGallery from "./TrackingGallery";
import { PageShell } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GsapPulse } from "@/components/ui/GsapMotion";

interface ProposalTrackingPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}


export default async function ProposalTrackingPage({ params }: ProposalTrackingPageProps) {
  const { id: proposalId, locale } = await params;

  // Retrieve proposal details
  const proposal = await db.query.proposals.findFirst({
    where: eq(proposals.id, proposalId),
    with: {
      user: true
    }
  });

  if (!proposal) {
    notFound();
  }

  const t = await getTranslations("TrackingGallery");
  
  // Extract and format survey details
  const photos = Array.isArray(proposal.surveyPhotos) 
    ? (proposal.surveyPhotos as string[]).filter(Boolean) 
    : [];

  const surveyDateFormatted = proposal.surveyDate 
    ? new Date(proposal.surveyDate).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) 
    : null;

  // Survey progression steps
  const steps = [
    {
      title: locale === "th" ? "นัดหมายการสำรวจ" : "Survey Scheduled",
      description: locale === "th" ? "กำหนดวันเข้าตรวจวัดพื้นที่ติดตั้งโซล่าเซลล์" : "Site assessment date and time scheduled.",
      isDone: true,
      isActive: !proposal.surveyDate
    },
    {
      title: locale === "th" ? "สำรวจหน้างานจริง" : "Field Assessment",
      description: locale === "th" ? "ทีมวิศวกรเข้าตรวจสอบโครงสร้างหลังคาและระบบไฟฟ้า" : "Engineering crew reviews structural and wiring compatibility.",
      isDone: !!proposal.surveyDate || photos.length > 0,
      isActive: !!proposal.surveyDate && photos.length === 0
    },
    {
      title: locale === "th" ? "อัปโหลดข้อมูลสำรวจ" : "Evidence Upload",
      description: locale === "th" ? "วิศวกรภาคสนามทำการอัปโหลดรูปภาพและรายงานสำรวจ" : "Field team uploads survey evidence to system log.",
      isDone: photos.length > 0,
      isActive: photos.length > 0 && proposal.status === "SENT"
    },
    {
      title: locale === "th" ? "อัปเดตใบเสนอราคา" : "Quotation Generation",
      description: locale === "th" ? "สรุปราคาสุดท้ายเพื่อลงนามและเตรียมชำระเงิน" : "Finalize customized proposal quotation for signing.",
      isDone: proposal.status === "SIGNED" || proposal.status === "CONFIRMED" || proposal.status === "PAID",
      isActive: proposal.status === "SIGNED"
    }
  ];

  return (
    <PageShell as="div" className="bg-background px-4 py-12 font-sans sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Back navigation & Header */}
        <div className="flex flex-col gap-4">
          <Link
            href={`/${locale}/proposals`}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors self-start"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{locale === "th" ? "กลับหน้าเอกสาร" : "Back to Proposals"}</span>
          </Link>

          <Card className="bg-brand-surface p-6 shadow-sm sm:p-8">
            <div>
              <span className="px-3 py-1 bg-[#1CBBBB]/10 text-[#1CBBBB] rounded-full text-[9px] font-black uppercase tracking-wider border border-[#1CBBBB]/20">
                {locale === "th" ? "ติดตามการสำรวจหน้างาน" : "Survey Progression"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase mt-2">
                Quotation <span className="text-[#1CBBBB]">#{proposalId.slice(0, 8)}</span>
              </h1>
              <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mt-1 tracking-wider">
                {locale === "th" 
                  ? "ตรวจสอบภาพถ่ายและบันทึกประเมินโครงสร้างอาคารจริงโดยวิศวกรผู้เชี่ยวชาญ" 
                  : "Track physical structure survey updates, reports, and engineer findings."}
              </p>
            </div>
          </Card>
        </div>

        {/* Stepper Progression */}
        <Card className="space-y-8 bg-brand-surface p-6 shadow-sm sm:p-8">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            {locale === "th" ? "ขั้นตอนสำรวจพื้นที่" : "Survey Pipeline Stages"}
          </h2>

          <div className="relative flex flex-col md:flex-row justify-between gap-6">
            {/* Connector Line for Desktop */}
            <div className="hidden md:block absolute left-8 right-8 top-6 h-0.5 bg-slate-100 -z-0">
              <div 
                className="h-full bg-[#1CBBBB] transition-all duration-500"
                style={{ 
                  width: `${(steps.filter(s => s.isDone).length - 1) / (steps.length - 1) * 100}%` 
                }}
              />
            </div>

            {steps.map((step, idx) => {
              const isPast = step.isDone && !step.isActive;
              const isCurrent = step.isActive;
              const isFuture = !step.isDone && !step.isActive;

              return (
                <div key={idx} className="relative z-10 flex md:flex-col items-start md:items-center gap-4 md:gap-3 md:text-center md:flex-1">
                  {/* Status Indicator */}
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                    isPast && "bg-[#1CBBBB] border-[#1CBBBB] text-white",
                    isCurrent && "bg-brand-surface border-2 border-[#1CBBBB] text-[#1CBBBB] ring-4 ring-[#1CBBBB]/10",
                    isFuture && "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    {isPast ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : isCurrent ? (
                      <GsapPulse scale={1.08}>
                        <Clock className="h-6 w-6" />
                      </GsapPulse>
                    ) : (
                      <span className="text-xs font-black">{idx + 1}</span>
                    )}
                  </div>

                  <div>
                    <h3 className={cn(
                      "text-xs font-black uppercase tracking-wider",
                      isCurrent ? "text-slate-900" : isPast ? "text-slate-700" : "text-slate-400"
                    )}>
                      {step.title}
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1 max-w-[200px] leading-relaxed md:mx-auto">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Survey Date & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-brand-surface border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-48">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              {locale === "th" ? "กำหนดวันเข้าสำรวจ" : "Scheduled Survey Date"}
            </h4>
            <div className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-650 shrink-0">
                <Calendar className="w-6 h-6 text-[#1CBBBB]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{locale === "th" ? "วันที่ทำการสำรวจ" : "Survey Date"}</p>
                <p className="text-base font-black text-slate-800 uppercase mt-0.5 truncate">
                  {surveyDateFormatted || (locale === "th" ? "อยู่ระหว่างกำหนดวันนัดหมาย" : "Scheduling Survey")}
                </p>
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{locale === "th" ? "เวลาโดยประมาณ 09:00 - 16:00 น." : "Estimated time: 9:00 AM - 4:00 PM."}</span>
            </p>
          </div>

          <div className="bg-brand-surface border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-48">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              {locale === "th" ? "บันทึกข้อมูลหน้างานโดยวิศวกร" : "Engineer Survey Notes"}
            </h4>
            <div className="flex items-start gap-4 py-4 overflow-y-auto max-h-24">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-650 shrink-0 mt-0.5">
                <FileText className="w-6 h-6 text-[#1CBBBB]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{locale === "th" ? "ข้อมูลผลการตรวจประเมิน" : "Structural Findings"}</p>
                <p className="text-xs font-semibold text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                  {proposal.surveyNotes || (locale === "th" ? "ไม่มีบันทึกข้อมูลเพิ่มเติม" : "No notes uploaded yet.")}
                </p>
              </div>
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase">
              {locale === "th" ? "วิศวกรภาคสนามได้รับรองความปลอดภัยแล้ว" : "Certified Safety and Structural Review"}
            </div>
          </div>
        </div>

        {/* Survey Photo Evidence Section */}
        <Card className="space-y-6 bg-brand-surface p-6 shadow-sm sm:p-8">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Camera className="w-4.5 h-4.5 text-[#1CBBBB]" />
            {locale === "th" ? "ภาพถ่ายประเมินพื้นที่และอุปกรณ์" : "Site Assessment Photo Evidence"}
          </h3>
          
          <TrackingGallery photos={photos} />
        </Card>

      </div>
    </PageShell>
  );
}
