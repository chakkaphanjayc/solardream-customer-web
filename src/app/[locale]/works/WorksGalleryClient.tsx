"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Images, MapPin, SunMedium } from "@/components/ui/icons";
import { isPortfolioProject, type PortfolioProjectListItem, type ProjectCaseStudy, type ProjectFilter } from "@/types/portfolio";
import ProjectDetailModal from "@/components/agency/sections/ProjectDetailModal";
import { cn } from "@/lib/utils";
import { SolarStatePanel } from "@/components/ui/solar-system";

type WorksGalleryClientProps = Readonly<{
  locale: string;
  initialProjects: readonly PortfolioProjectListItem[];
}>;

type FilterDefinition = Readonly<{
  id: ProjectFilter;
  labelTh: string;
  labelEn: string;
}>;

const FILTER_DEFINITIONS: readonly FilterDefinition[] = [
  { id: "all", labelTh: "ผลงานทั้งหมด", labelEn: "All projects" },
  { id: "5kw", labelTh: "5.0 kW", labelEn: "5.0 kW" },
  { id: "10kw", labelTh: "10.0 kW", labelEn: "10.0 kW" },
  { id: "8kw", labelTh: "8.0 kW", labelEn: "8.0 kW" },
  { id: "3kw", labelTh: "3.0 kW", labelEn: "3.0 kW" },
  { id: "chiangmai", labelTh: "เชียงใหม่", labelEn: "Chiang Mai" },
  { id: "bangkok", labelTh: "กรุงเทพฯ", labelEn: "Bangkok" },
  { id: "phuket", labelTh: "ภูเก็ต", labelEn: "Phuket" },
];

function ImageWithFallback({
  src,
  alt,
  fill,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-[var(--sd-soft-solar)] p-6 text-center text-[var(--sd-ink)]">
        <SunMedium className="h-8 w-8 text-[var(--sd-blue-600)]" aria-hidden="true" />
        <span className="mt-2 text-xs font-black">SolarDream rooftop</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setError(true)}
    />
  );
}

type WorksProjectCardProps = Readonly<{
  project: PortfolioProjectListItem;
  index: number;
  total: number;
  locale: string;
  isLoading: boolean;
  onSelect: (project: PortfolioProjectListItem) => void;
}>;

const WorksProjectCard = memo(function WorksProjectCard({
  project,
  index,
  total,
  locale,
  isLoading,
  onSelect,
}: WorksProjectCardProps) {
  const isTh = locale === "th";
  const isFeatured = index % 5 === 0;

  return (
    <article
      data-works-card={project.id}
      className={cn(
        "solar-works-card group relative min-h-[27rem] overflow-hidden rounded-[var(--sd-radius-lg)] bg-[var(--sd-navy-950)] transition-[box-shadow,transform] duration-300 ease-expo-out hover:-translate-y-1",
        isFeatured && "md:col-span-2 md:min-h-[34rem] xl:col-span-2",
      )}
    >
      <div className="absolute inset-0 bg-slate-900">
        <ImageWithFallback
          src={project.heroImage}
          alt={project.title}
          fill
          priority={index === 0}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 900px"
          className="object-cover transition-transform duration-700 ease-expo-out group-hover:scale-[1.04]"
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[rgb(7_27_61_/_0.2)] via-transparent to-[rgb(7_27_61_/_0.96)]" />

      <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3 sm:inset-x-5 sm:top-5">
        <div className="solar-works-pill inline-flex max-w-[65%] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-black">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--sd-blue-600)]" aria-hidden="true" />
          <span className="truncate">{project.location || (isTh ? "ประเทศไทย" : "Thailand")}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="solar-works-pill hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-black sm:inline-flex">
            <Images className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{project.galleryImageCount || 1}</span>
          </div>
          <div className="solar-works-pill solar-works-pill--accent rounded-full px-2.5 py-1.5 text-[11px] font-black">
            {project.solarSizeKw} kW
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--sd-cyan-100)]">
          <span>{isTh ? `ติดตั้งแล้ว ${project.completionYear}` : `Installed ${project.completionYear}`}</span>
          <span>{String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
        </div>
        <h2 className="mt-2 max-w-2xl text-xl font-black leading-tight tracking-[-0.02em] text-white sm:text-2xl">
          {project.title}
        </h2>

        <div className="mt-4 flex items-end justify-between gap-3 border-t-2 border-white/30 pt-3">
          {project.showFinancials !== false ? (
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">
                {isTh ? "ประหยัดค่าไฟโดยประมาณ" : "Estimated monthly savings"}
              </span>
              <span className="mt-1 block text-base font-black text-[var(--sd-cyan-100)] sm:text-lg">
                ฿{project.monthlySavingsThb.toLocaleString("th-TH")} / {isTh ? "เดือน" : "month"}
              </span>
            </div>
          ) : (
            <div className="min-w-0" />
          )}

          <button
            type="button"
            aria-label={`${isTh ? "ดูรายละเอียด" : "View details"} ${project.title}`}
            onClick={() => onSelect(project)}
            disabled={isLoading}
            className="solar-works-button inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-50"
          >
            <span>{isLoading ? (isTh ? "กำลังโหลด..." : "Loading...") : isTh ? "ดูรายละเอียด" : "View case"}</span>
            <ArrowUpRight className="h-4 w-4 stroke-[3]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});

export default function WorksGalleryClient({ locale, initialProjects }: WorksGalleryClientProps) {
  const isTh = locale === "th";
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [selectedProject, setSelectedProject] = useState<ProjectCaseStudy | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [projectLoadError, setProjectLoadError] = useState(false);
  const [failedProject, setFailedProject] = useState<PortfolioProjectListItem | null>(null);
  const projectDetailsCache = useRef(new Map<string, ProjectCaseStudy>());
  const filterOptions = useMemo(
    () => FILTER_DEFINITIONS.map((item) => ({
      id: item.id,
      label: isTh ? item.labelTh : item.labelEn,
    })).map((item) => (
      item.id === "all" ? { ...item, label: `${item.label} (${initialProjects.length})` } : item
    )),
    [initialProjects.length, isTh],
  );

  const filteredProjects = useMemo(
    () => initialProjects.filter((project) => {
      if (filter === "all") return true;
      if (filter === "3kw") return project.solarSizeKw === 3;
      if (filter === "5kw") return project.solarSizeKw === 5;
      if (filter === "8kw") return project.solarSizeKw === 8;
      if (filter === "10kw") return project.solarSizeKw === 10;
      if (filter === "chiangmai") return project.province === "chiangmai";
      if (filter === "bangkok") return project.province === "bangkok";
      if (filter === "phuket") return project.province === "phuket";
      return true;
    }),
    [filter, initialProjects],
  );
  const activeFilterLabel = useMemo(
    () => filter === "all" ? (isTh ? "ทุกผลงาน" : "All projects") : filterOptions.find((item) => item.id === filter)?.label,
    [filter, filterOptions, isTh],
  );

  const handleProjectSelect = useCallback(async (project: PortfolioProjectListItem) => {
    const cachedProject = projectDetailsCache.current.get(project.id);
    if (cachedProject) {
      setProjectLoadError(false);
      setFailedProject(null);
      setSelectedProject(cachedProject);
      return;
    }

    if (loadingProjectId === project.id) return;
    setProjectLoadError(false);
    setFailedProject(null);
    setLoadingProjectId(project.id);

    try {
      const response = await fetch(`/api/portfolio?projectId=${encodeURIComponent(project.id)}`, { cache: "no-store" });
      const payload: unknown = await response.json();
      const payloadProject = payload !== null && typeof payload === "object" && "project" in payload
        ? payload.project
        : null;

      if (!response.ok || !isPortfolioProject(payloadProject)) {
        throw new Error("Installation project details could not be loaded.");
      }

      projectDetailsCache.current.set(project.id, payloadProject);
      setSelectedProject(payloadProject);
    } catch (error: unknown) {
      console.error("[WorksGalleryClient] Failed to load project details:", error);
      setProjectLoadError(true);
      setFailedProject(project);
    } finally {
      setLoadingProjectId((current) => current === project.id ? null : current);
    }
  }, [loadingProjectId]);

  const handleModalClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <div data-bagui="works-gallery" className="w-full space-y-7">
      <section
        data-bagui="works-filter-bar"
        aria-labelledby="works-filter-title"
        className="solar-works-filter-bar rounded-2xl p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p id="works-filter-title" className="solar-works-filter-kicker text-[10px] font-black uppercase tracking-[0.14em] text-[var(--sd-blue-600)]">
              {isTh ? "เลือกดูผลงาน" : "Browse installations"}
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-lg font-black text-[var(--sd-ink)]">
                {isTh ? "ภาพงานติดตั้งจริง" : "Installation archive"}
              </p>
              <span aria-live="polite" className="text-xs font-bold text-[var(--sd-muted)]">
                {filteredProjects.length} {isTh ? "แสดงผล" : "shown"}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2" role="group" aria-label={isTh ? "ตัวกรองผลงาน" : "Project filters"}>
            {filterOptions.map((item) => {
              const isActive = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  aria-pressed={isActive}
                  data-works-filter={item.id}
                  className={cn(
                    "solar-works-filter min-h-10 cursor-pointer rounded-full px-3 py-2 text-xs font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--sd-focus)]",
                    isActive
                      ? "solar-works-filter--active"
                      : "solar-works-filter--idle",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="solar-works-results-meta flex items-center justify-between gap-4 border-b pb-3 text-xs font-semibold text-[var(--sd-text)]">
        <span>{isTh ? "เลื่อนดูภาพติดตั้งจริง แล้วเปิดดูรายละเอียดแต่ละบ้าน" : "Browse the photography, then open a home for the full case study."}</span>
        <span className="solar-works-active-filter shrink-0 font-black text-[var(--sd-blue-600)]">{activeFilterLabel}</span>
      </div>

      {projectLoadError ? (
        <SolarStatePanel
          kind="error"
          title={isTh ? "เปิดรายละเอียดผลงานไม่สำเร็จ" : "This case study could not be opened"}
          description={isTh ? "ข้อมูลโครงการยังโหลดไม่ครบ ลองอีกครั้งเพื่อเปิดรายละเอียดบ้านหลังนี้" : "The project details did not finish loading. Try again to open this installation case study."}
          soliaAlt={isTh ? "โซเลียกำลังช่วยเปิดรายละเอียดผลงานติดตั้ง" : "Solia helping reopen the installation case study"}
          action={failedProject ? <button type="button" className="solar-ui-secondary rounded-full px-4 py-2.5 text-xs font-bold" onClick={() => void handleProjectSelect(failedProject)}>{isTh ? "ลองอีกครั้ง" : "Try again"}</button> : undefined}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProjects.map((project, index) => (
          <WorksProjectCard
            key={project.id}
            project={project}
            index={index}
            total={filteredProjects.length}
            locale={locale}
            isLoading={loadingProjectId === project.id}
            onSelect={handleProjectSelect}
          />
        ))}
      </div>

      {filteredProjects.length === 0 ? (
        <SolarStatePanel
          kind="empty"
          className="solar-works-empty"
          title={isTh ? "ยังไม่มีผลงานในหมวดนี้" : "No installations match this filter"}
          description={isTh ? "ลองเปลี่ยนตัวกรองเพื่อดูบ้านที่ติดตั้งจริงในหมวดอื่น" : "Try another filter to browse more real SolarDream installations."}
          soliaAlt={isTh ? "โซเลียกำลังช่วยเลือกหมวดผลงานติดตั้ง" : "Solia helping choose another installation category"}
        />
      ) : null}

      <ProjectDetailModal
        project={selectedProject}
        locale={locale}
        onClose={handleModalClose}
      />
    </div>
  );
}
