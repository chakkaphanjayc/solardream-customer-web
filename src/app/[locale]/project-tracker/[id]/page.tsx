import { db } from "@/db";
import { installationProjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import {
  Wrench,
  Calendar,
  ShieldCheck,
  Layers,
  Camera,
  ArrowRight,
  Info,
  Phone,
  FileCheck2,
} from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import ProtectedImage from "@/components/ui/ProtectedImage";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { SolarProgressStepper } from "@/components/ui/solar-system";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";


interface TrackerPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

function toPositiveNumber(value: unknown): number | null {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
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

  const snap = project.lead?.configurationSnapshot as { totalPrice?: number | null; items?: unknown[] } | null;
  const quotationValue = toPositiveNumber(snap?.totalPrice);
  const completedChecklist = Array.isArray(project.checklist) ? (project.checklist as string[]) : [];
  const projectPhotos = Array.isArray(project.photos)
    ? project.photos.filter(
        (url): url is string => typeof url === "string" && url.trim() !== "",
      )
    : [];
  const componentCount = Array.isArray(snap?.items) ? snap.items.length : null;
  const currentStepIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === project.status),
  );
  const stepItems = steps.map((step, index) => ({
    id: step.status,
    label: step.label,
    description: step.description,
    status:
      index < currentStepIndex
        ? ("complete" as const)
        : index === currentStepIndex
          ? ("current" as const)
          : ("idle" as const),
  }));

  return (
    <SolarRouteShell className="solar-project-tracker px-4 pb-16 font-sans sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">

        {/* Tracker Branded Header */}
        <header className="solar-route-card solar-route-card--strong flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex min-w-0 items-start gap-4">
            <div className="min-w-0">
            <span className="solar-route-kicker">
              {t("badge")}
            </span>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-[var(--sd-ink)] sm:text-3xl">
              {t("powering")} <span className="text-[var(--sd-blue-600)]">{project.lead?.name || t("customer")}</span>
            </h1>
            <p className="mt-2 text-xs font-semibold tracking-wide text-[var(--sd-muted)]">
              {t("intro")}
            </p>
            </div>
            <SoliaGuide
              alt={locale === "th" ? "Solia ช่วยอธิบายความคืบหน้าการติดตั้ง" : "Solia explaining your installation progress"}
              pose="pointing"
              className="hidden h-24 w-20 shrink-0 sm:block"
              imageSizes="80px"
            />
          </div>
          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--sd-line)] px-4 text-xs font-bold text-[var(--sd-text)] transition-colors hover:border-[var(--sd-blue-500)] hover:bg-[var(--sd-soft-solar)] hover:text-[var(--sd-blue-600)]"
          >
            <span>{t("home")}</span>
            <ArrowRight className="size-4" />
          </Link>
        </header>

        {/* Live Stepper Journey */}
        <section className="solar-route-card space-y-6 p-5 sm:p-7" aria-labelledby="project-pipeline-title">
          <h2 id="project-pipeline-title" className="solar-route-kicker">
            {t("pipelineStages")}
          </h2>
          <SolarProgressStepper
            items={stepItems}
            ariaLabel={t("pipelineStages")}
            interactive={false}
          />
        </section>

        {/* Schedule & Team Allocation Detail Info */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="solar-route-card flex min-h-52 flex-col justify-between p-5 sm:p-6">
            <h2 className="solar-route-kicker">
              {t("installationSchedule")}
            </h2>
            <div className="flex items-center gap-4 py-5">
              <div className="solar-soft-panel grid size-12 shrink-0 place-items-center text-[var(--sd-blue-600)]">
                <Calendar className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--sd-muted)]">{t("targetDate")}</p>
                <p className="mt-1 text-base font-black tracking-tight text-[var(--sd-ink)] sm:text-lg">
                  {project.scheduledDate ? new Date(project.scheduledDate).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : t("schedulingInProgress")}
                </p>
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--sd-muted)]">
              <Info className="size-3.5" />
              <span>{t("weatherNotice")}</span>
            </p>
          </section>

          <section className="solar-route-card flex min-h-52 flex-col justify-between p-5 sm:p-6">
            <h2 className="solar-route-kicker">
              {t("assignedTeam")}
            </h2>
            <div className="flex items-center gap-4 py-5">
              <div className="solar-soft-panel grid size-12 shrink-0 place-items-center text-[var(--sd-blue-600)]">
                <Wrench className="size-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--sd-muted)]">{t("operationalCrew")}</p>
                <p className="mt-1 text-base font-black tracking-tight text-[var(--sd-ink)] sm:text-lg">
                  {project.assignedTeam || t("allocatingCrew")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--sd-muted)]">
              <Phone className="size-3.5 text-[var(--sd-blue-600)]" />
              <span>{t("questions")} <strong>02-123-4567</strong></span>
            </div>
          </section>
        </div>

        {/* Safety & Job Checklist Progress */}
        <section className="solar-route-card space-y-6 p-6 sm:p-8" aria-labelledby="project-safety-title">
          <div className="flex items-center justify-between gap-4">
            <h2 id="project-safety-title" className="solar-route-kicker flex items-center gap-1.5">
              <ShieldCheck className="size-4" />
              {t("safetyChecks")}
            </h2>
            <span className="solar-ui-status shrink-0" data-tone="success">
              {t("verifiedTasks", { count: completedChecklist.length })}
            </span>
          </div>

          {completedChecklist.length === 0 ? (
            <div className="solar-soft-panel border-dashed px-4 py-6 text-center text-xs font-semibold text-[var(--sd-muted)]">
              {t("verificationPending")}
            </div>
          ) : (
            <div className="space-y-3">
              {completedChecklist.map((item, idx) => (
                <div key={idx} className="solar-soft-panel flex items-start gap-3 p-3">
                  <div className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--sd-soft-solar)] text-[var(--sd-success)]">
                    <FileCheck2 className="size-3.5" />
                  </div>
                  <span className="text-sm font-semibold text-[var(--sd-text)]">{item}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Live Photo Stream */}
        <section className="solar-route-card space-y-6 p-6 sm:p-8" aria-labelledby="project-photos-title">
          <h2 id="project-photos-title" className="solar-route-kicker flex items-center gap-1.5">
            <Camera className="size-4" />
            {t("sitePhotos")}
          </h2>

          {projectPhotos.length === 0 ? (
            <div className="solar-soft-panel border-dashed px-4 py-12 text-center text-xs font-semibold text-[var(--sd-muted)]">
              {t("photosPending")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {projectPhotos.map((url, idx) => (
                <div key={idx} className="solar-soft-panel relative aspect-square overflow-hidden transition-transform hover:scale-[1.01]">
                  <ProtectedImage
                    src={url}
                    alt={t("progressPhoto", { count: idx + 1 })}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="w-full h-full object-cover"
                  >
                    <div className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-full bg-[var(--sd-navy-900)]/85 px-2.5 py-1 text-[9px] font-bold tracking-wide text-white backdrop-blur-sm select-none">
                      {t("progressUpdate", { count: idx + 1 })}
                    </div>
                  </ProtectedImage>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Technical Specification Snapshot Summary */}
        {snap && (
          <section className="solar-route-card space-y-4 p-6" aria-labelledby="project-snapshot-title">
            <h2 id="project-snapshot-title" className="solar-route-kicker flex items-center gap-1.5">
              <Layers className="size-4" />
              <span>{t("systemSnapshot")}</span>
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="solar-soft-panel space-y-2 p-4">
                <span className="block text-[9px] font-black uppercase tracking-wide text-[var(--sd-muted)]">{t("quotationValue")}</span>
                <span className="block text-base font-black font-mono text-[var(--sd-warning)]">
                  {quotationValue === null ? t("quotationPending") : formatPrice(quotationValue)}
                </span>
                <span className="text-[10px] font-semibold text-[var(--sd-muted)]">{t("quotationNote")}</span>
              </div>
              <div className="solar-soft-panel space-y-2 p-4">
                <span className="block text-[9px] font-black uppercase tracking-wide text-[var(--sd-muted)]">{t("componentsCount")}</span>
                <span className="block text-base font-black text-[var(--sd-ink)]">
                  {componentCount === null
                    ? t("componentsPending")
                    : t("solarItems", { count: componentCount })}
                </span>
                <span className="text-[10px] font-semibold text-[var(--sd-muted)]">{t("componentsNote")}</span>
              </div>
            </div>
          </section>
        )}

      </div>
    </SolarRouteShell>
  );
}
