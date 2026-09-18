import { db } from "@/db";
import { proposals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, CheckCircle2, Clock, Camera } from "@/components/ui/icons";
import TrackingGallery from "./TrackingGallery";
import { PageShell } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GsapPulse } from "@/components/ui/GsapMotion";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { getTranslations } from "next-intl/server";

interface ProposalTrackingPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}



export default async function ProposalTrackingPage({ params }: ProposalTrackingPageProps) {
  const { id: proposalId, locale } = await params;
  const messageLocale = locale === "th" ? "th" : "en";
  const t = await getTranslations({
    locale: messageLocale,
    namespace: "ProposalTracking",
  });

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
      title: t("steps.scheduled.title"),
      description: t("steps.scheduled.description"),
      isDone: true,
      isActive: !proposal.surveyDate
    },
    {
      title: t("steps.field.title"),
      description: t("steps.field.description"),
      isDone: !!proposal.surveyDate || photos.length > 0,
      isActive: !!proposal.surveyDate && photos.length === 0
    },
    {
      title: t("steps.evidence.title"),
      description: t("steps.evidence.description"),
      isDone: photos.length > 0,
      isActive: photos.length > 0 && proposal.status === "SENT"
    },
    {
      title: t("steps.quotation.title"),
      description: t("steps.quotation.description"),
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
            <span>{t("back")}</span>
          </Link>

          <Card className="solar-ui-panel solar-route-card bg-brand-surface p-6 shadow-sm sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
              <span className="px-3 py-1 bg-[#1CBBBB]/10 text-[#1CBBBB] rounded-full text-[9px] font-black uppercase tracking-wider border border-[#1CBBBB]/20">
                {t("badge")}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase mt-2">
                {t("title", { id: proposalId.slice(0, 8) })}
              </h1>
              <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mt-1 tracking-wider">
                {t("description")}
              </p>
              </div>
              <SoliaGuide
                alt={t("soliaAlt")}
                pose="blueprint"
                className="hidden h-28 w-24 shrink-0 sm:block"
                imageSizes="96px"
              />
            </div>
          </Card>
        </div>

        {/* Stepper Progression */}
        <Card className="solar-ui-panel solar-route-card space-y-8 bg-brand-surface p-6 shadow-sm sm:p-8">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            {t("stagesTitle")}
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
              {t("surveyCard.title")}
            </h4>
            <div className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-650 shrink-0">
                <Calendar className="w-6 h-6 text-[#1CBBBB]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{t("surveyCard.dateLabel")}</p>
                <p className="text-base font-black text-slate-800 uppercase mt-0.5 truncate">
                  {surveyDateFormatted || t("surveyCard.pending")}
                </p>
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{t("surveyCard.time")}</span>
            </p>
          </div>

          <div className="bg-brand-surface border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-48">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              {t("notesCard.title")}
            </h4>
            <div className="flex items-start gap-4 py-4 overflow-y-auto max-h-24">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-650 shrink-0 mt-0.5">
                <FileText className="w-6 h-6 text-[#1CBBBB]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-500 uppercase">{t("notesCard.findings")}</p>
                <p className="text-xs font-semibold text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                  {proposal.surveyNotes || t("notesCard.empty")}
                </p>
              </div>
            </div>
            <div className="text-[9px] font-black text-slate-400 uppercase">
              {t("notesCard.certified")}
            </div>
          </div>
        </div>

        {/* Survey Photo Evidence Section */}
        <Card className="solar-route-card space-y-6 bg-brand-surface p-6 shadow-sm sm:p-8">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Camera className="w-4.5 h-4.5 text-[#1CBBBB]" />
            {t("photosTitle")}
          </h3>
          
          <TrackingGallery photos={photos} />
        </Card>

      </div>
    </PageShell>
  );
}
