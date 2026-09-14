import { db } from "@/db";
import { installationProjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  Wrench, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Camera, 
  ArrowRight,
  Info,
  Phone,
  FileCheck2
} from "@/components/ui/icons";
import { cn, formatPrice } from "@/lib/utils";
import ProtectedImage from "@/components/ui/ProtectedImage";
import { GsapPulse } from "@/components/ui/GsapMotion";
import { PageShell } from "@/components/ui/page-shell";

interface TrackerPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}


export default async function ProjectTrackerPage({ params }: TrackerPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("ProjectTracker");
  const steps = [
    { status: "PREP", label: t("steps.prep.label"), description: t("steps.prep.description") },
    { status: "INSTALLING", label: t("steps.installing.label"), description: t("steps.installing.description") },
    { status: "INSPECTION", label: t("steps.inspection.label"), description: t("steps.inspection.description") },
    { status: "COMPLETE", label: t("steps.complete.label"), description: t("steps.complete.description") },
  ];
  const project = await db.query.installationProjects.findFirst({
    where: eq(installationProjects.id, id),
    with: {
      lead: true
    }
  });

  if (!project) {
    notFound();
  }

  const snap = project.lead?.configurationSnapshot as { totalPrice?: number; items?: unknown[] } | null;
  const completedChecklist = Array.isArray(project.checklist) ? (project.checklist as string[]) : [];
  const currentStepIndex = steps.findIndex((step) => step.status === project.status);

  return (
    <PageShell as="div" className="solar-project-tracker bg-transparent px-4 py-12 font-sans sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Tracker Branded Header */}
        <div className="bg-brand-surface border border-slate-200 rounded-[2rem] p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <span className="px-3 py-1 bg-[#1CBBBB]/10 text-[#1CBBBB] rounded-full text-[9px] font-black uppercase tracking-wider">
              {t("badge")}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase mt-2">
              {t("powering")} <span className="text-[#1CBBBB]">{project.lead?.name || t("customer")}</span>
            </h1>
            <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase mt-1 tracking-wider">
              {t("intro")}
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span>{t("home")}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Live Stepper Journey */}
        <div className="bg-brand-surface border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-8">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">
            {t("pipelineStages")}
          </h2>

          <div className="relative flex flex-col md:flex-row justify-between gap-6">
            {/* Connector Line for Desktop */}
            <div className="hidden md:block absolute left-8 right-8 top-6 h-0.5 bg-slate-100 -z-0">
              <div 
                className="h-full bg-[#1CBBBB] transition-all duration-500"
                style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div key={idx} className="relative z-10 flex md:flex-col items-start md:items-center gap-4 md:gap-3 md:text-center md:flex-1">
                  {/* Status Indicator */}
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300",
                    isPast && "bg-[#1CBBBB] border-[#1CBBBB] text-white",
                    isCurrent && "bg-brand-surface border-2 border-[#1CBBBB] text-[#1CBBBB] ring-4 ring-[#1CBBBB]/10",
                    isFuture && "bg-slate-50 border-slate-200 text-slate-455"
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
                      isCurrent ? "text-slate-900" : isPast ? "text-slate-700" : "text-slate-450"
                    )}>
                      {step.label}
                    </h3>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1 max-w-[200px] leading-relaxed md:mx-auto">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule & Team Allocation Detail Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-brand-surface border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-48">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              {t("installationSchedule")}
            </h4>
            <div className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{t("targetDate")}</p>
                <p className="text-lg font-black text-slate-800 uppercase mt-0.5">
                  {project.scheduledDate ? new Date(project.scheduledDate).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : t("schedulingInProgress")}
                </p>
              </div>
            </div>
            <p className="text-[9px] font-bold text-slate-450 uppercase flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>{t("weatherNotice")}</span>
            </p>
          </div>

          <div className="bg-brand-surface border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between h-48">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              {t("assignedTeam")}
            </h4>
            <div className="flex items-center gap-4 py-4">
              <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{t("operationalCrew")}</p>
                <p className="text-lg font-black text-slate-800 uppercase mt-0.5">
                  {project.assignedTeam || t("allocatingCrew")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <Phone className="w-3.5 h-3.5 text-[#1CBBBB]" />
              <span>{t("questions")} <strong>02-123-4567</strong></span>
            </div>
          </div>
        </div>

        {/* Safety & Job Checklist Progress */}
        <div className="bg-brand-surface border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4.5 h-4.5 text-[#1CBBBB]" />
              {t("safetyChecks")}
            </h3>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100">
              {t("verifiedTasks", { count: completedChecklist.length })}
            </span>
          </div>

          {completedChecklist.length === 0 ? (
            <div className="py-6 text-center text-slate-450 text-[10.5px] font-bold uppercase tracking-wider bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              {t("verificationPending")}
            </div>
          ) : (
            <div className="space-y-3">
              {completedChecklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                  <div className="w-5 h-5 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 shrink-0">
                    <FileCheck2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10.5px] font-semibold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Photo Stream */}
        <div className="bg-brand-surface border border-slate-200 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Camera className="w-4.5 h-4.5 text-[#1CBBBB]" />
            {t("sitePhotos")}
          </h3>

          {!project.photos || project.photos.length === 0 ? (
            <div className="py-12 text-center text-slate-450 text-xs font-bold uppercase tracking-wider border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              {t("photosPending")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {project.photos.filter(url => url && url.trim() !== "").map((url, idx) => (
                <div key={idx} className="relative aspect-square border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:scale-[1.01] transition-transform">
                  <ProtectedImage
                    src={url}
                    alt={t("progressPhoto", { count: idx + 1 })}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="w-full h-full object-cover"
                  >
                    <div className="absolute bottom-3 left-3 z-30 px-2 py-0.5 bg-slate-900/70 text-white rounded text-[8px] font-bold uppercase tracking-wider backdrop-blur-xs pointer-events-none select-none">
                      {t("progressUpdate", { count: idx + 1 })}
                    </div>
                  </ProtectedImage>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technical Specification Snapshot Summary */}
        {snap && (
          <div className="bg-brand-surface border border-slate-200 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h4 className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-[#1CBBBB]" />
              <span>{t("systemSnapshot")}</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-2">
                <span className="text-[7.5px] uppercase font-black text-slate-400 block">{t("quotationValue")}</span>
                <span className="text-base font-black font-mono text-[#D8A87B] block">
                  {formatPrice(snap.totalPrice || 0)}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase">{t("quotationNote")}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-2">
                <span className="text-[7.5px] uppercase font-black text-slate-400 block">{t("componentsCount")}</span>
                <span className="text-base font-black text-slate-800 block">
                  {t("solarItems", { count: snap.items?.length || 0 })}
                </span>
                <span className="text-[8px] font-bold text-slate-555 uppercase">{t("componentsNote")}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageShell>
  );
}
