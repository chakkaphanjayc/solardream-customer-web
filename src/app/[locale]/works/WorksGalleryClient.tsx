"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Filter,
  Images,
  MapPin,
  Star,
  SunMedium,
  Zap,
} from "@/components/ui/icons";
import {
  isPortfolioProject,
  type PortfolioProjectListItem,
  type ProjectCaseStudy,
} from "@/types/portfolio";
import ProjectDetailModal from "@/components/agency/sections/ProjectDetailModal";
import { cn } from "@/lib/utils";
import { SolarStatePanel } from "@/components/ui/solar-system";

type WorksGalleryClientProps = Readonly<{
  locale: string;
  initialProjects: readonly PortfolioProjectListItem[];
}>;

type SizeFilter = "all" | "3kw" | "5kw" | "8kw" | "10kw";
type RegionFilter = "all" | "bangkok" | "chiangmai" | "phuket" | "residential" | "commercial";
type SortOption = "newest" | "largest_kw";

const SIZE_FILTERS: ReadonlyArray<{ id: SizeFilter; labelEn: string; labelTh: string }> = [
  { id: "all", labelEn: "All Sizes", labelTh: "ทุกขนาดระบบ" },
  { id: "3kw", labelEn: "3.0 kW", labelTh: "3.0 kW" },
  { id: "5kw", labelEn: "5.0 kW", labelTh: "5.0 kW" },
  { id: "8kw", labelEn: "8.0 kW", labelTh: "8.0 kW" },
  { id: "10kw", labelEn: "10.0+ kW", labelTh: "10.0+ kW" },
];

const REGION_FILTERS: ReadonlyArray<{ id: RegionFilter; labelEn: string; labelTh: string }> = [
  { id: "all", labelEn: "All Areas & Types", labelTh: "ทุกพื้นที่ & ประเภท" },
  { id: "bangkok", labelEn: "Bangkok", labelTh: "กรุงเทพฯ" },
  { id: "chiangmai", labelEn: "Chiang Mai", labelTh: "เชียงใหม่" },
  { id: "phuket", labelEn: "Phuket", labelTh: "ภูเก็ต" },
  { id: "residential", labelEn: "Residential", labelTh: "บ้านพักอาศัย" },
  { id: "commercial", labelEn: "Commercial", labelTh: "ธุรกิจ & อาคาร" },
];

function BrandedSolarPlaceholder({ alt }: { alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt || "SolarDream Rooftop Installation"}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#F0EBE5] p-6 text-center text-[var(--sd-ink)]"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 300"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="200" cy="90" r="45" stroke="#5089bf" strokeWidth="6" strokeDasharray="6 4" />
        <path d="M50 250 L150 160 L250 160 L350 250" stroke="#5089bf" strokeWidth="8" strokeLinecap="round" />
        <path d="M120 180 L280 180" stroke="#B7D1EA" strokeWidth="6" />
        <path d="M90 220 L310 220" stroke="#B7D1EA" strokeWidth="6" />
        <path d="M180 160 L140 250" stroke="#5089bf" strokeWidth="4" />
        <path d="M220 160 L260 250" stroke="#5089bf" strokeWidth="4" />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#DCE8F5] text-[#5089bf] shadow-xs">
          <SunMedium className="h-6 w-6 stroke-[2.2]" aria-hidden="true" />
        </div>
        <span className="mt-3 text-xs font-black tracking-wide text-[#3c567a]">SolarDream Installation</span>
        <span className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-[#475569]">{alt}</span>
      </div>
    </div>
  );
}

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
    return <BrandedSolarPlaceholder alt={alt} />;
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
  const isFeatured = Boolean(project.isFeatured);

  return (
    <article
      data-works-card={project.id}
      className={cn(
        "solar-works-card group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-[var(--sd-navy-950)] transition-[box-shadow,transform] duration-300 ease-expo-out hover:-translate-y-1 hover:shadow-xl",
        "min-h-[22rem] sm:min-h-[25rem]",
        isFeatured && "md:col-span-2 xl:col-span-2 md:min-h-[28rem]",
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
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[rgb(7_27_61_/_0.28)] via-[rgb(7_27_61_/_0.1)] to-[rgb(7_27_61_/_0.96)]"
      />

      {/* Top Header Pills */}
      <div className="relative z-10 flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 max-w-[70%]">
          <div className="solar-works-pill inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--sd-blue-600)]" aria-hidden="true" />
            <span className="truncate">{project.location || (isTh ? "ประเทศไทย" : "Thailand")}</span>
          </div>
          {isFeatured ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primary)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--accent-foreground)] shadow-xs">
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {isTh ? "โครงการเด่น" : "Featured"}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="solar-works-pill hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black sm:inline-flex">
            <Images className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{project.galleryImageCount || 1}</span>
          </div>
          <div className="solar-works-pill solar-works-pill--accent rounded-full px-2.5 py-1 text-[11px] font-black">
            {project.solarSizeKw} kW
          </div>
        </div>
      </div>

      {/* Bottom Content Area */}
      <div className="relative z-10 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--sd-cyan-100)]">
          <span>{isTh ? `ติดตั้งแล้ว ${project.completionYear}` : `Installed ${project.completionYear}`}</span>
          <span>
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
        <h2 className="mt-2 max-w-2xl text-xl font-black leading-tight tracking-[-0.02em] text-white sm:text-2xl">
          {project.title}
        </h2>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/20 pt-3">
          {project.showFinancials !== false && project.monthlySavingsThb > 0 ? (
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">
                {isTh ? "ประหยัดค่าไฟโดยประมาณ" : "Estimated monthly savings"}
              </span>
              <span className="mt-0.5 block text-base font-black text-[var(--sd-cyan-100)] sm:text-lg">
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
            className="solar-works-button inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-black disabled:cursor-wait disabled:opacity-50"
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
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedProject, setSelectedProject] = useState<ProjectCaseStudy | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [projectLoadError, setProjectLoadError] = useState(false);
  const [failedProject, setFailedProject] = useState<PortfolioProjectListItem | null>(null);
  const projectDetailsCache = useRef(new Map<string, ProjectCaseStudy>());

  // Filtering Logic
  const filteredProjects = useMemo(() => {
    const result = initialProjects.filter((project) => {
      // Size filter
      if (sizeFilter === "3kw" && project.solarSizeKw !== 3) return false;
      if (sizeFilter === "5kw" && project.solarSizeKw !== 5) return false;
      if (sizeFilter === "8kw" && project.solarSizeKw !== 8) return false;
      if (sizeFilter === "10kw" && project.solarSizeKw < 10) return false;

      // Region / Category filter
      if (regionFilter === "chiangmai" && project.province !== "chiangmai") return false;
      if (regionFilter === "bangkok" && project.province !== "bangkok") return false;
      if (regionFilter === "phuket" && project.province !== "phuket") return false;
      if (regionFilter === "residential" && project.category !== "residential") return false;
      if (regionFilter === "commercial" && project.category !== "commercial") return false;

      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === "largest_kw") {
        return b.solarSizeKw - a.solarSizeKw;
      }
      // "newest" by completionYear desc, then featured first
      if (a.isFeatured !== b.isFeatured) {
        return a.isFeatured ? -1 : 1;
      }
      return b.completionYear.localeCompare(a.completionYear);
    });
  }, [initialProjects, regionFilter, sizeFilter, sortBy]);

  const handleProjectSelect = useCallback(
    async (project: PortfolioProjectListItem) => {
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
        const response = await fetch(
          `/api/portfolio?projectId=${encodeURIComponent(project.id)}`,
          { cache: "no-store" },
        );
        const payload: unknown = await response.json();
        const payloadProject =
          payload !== null && typeof payload === "object" && "project" in payload
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
        setLoadingProjectId((current) => (current === project.id ? null : current));
      }
    },
    [loadingProjectId],
  );

  const handleModalClose = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <div data-bagui="works-gallery" className="w-full space-y-8">
      {/* Two-Row Grouped Filter Bar */}
      <section
        data-bagui="works-filter-bar"
        aria-labelledby="works-filter-title"
        className="rounded-3xl border border-[var(--border)] bg-[var(--sd-card)] p-5 shadow-xs sm:p-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-[var(--border)] pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--primary-foreground)]">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span id="works-filter-title">{isTh ? "เลือกดูผลงานตามเงื่อนไข" : "Curate Showcase"}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2.5">
              <h2 className="text-xl font-black text-[var(--sd-ink)]">
                {isTh ? "โครงการที่เผยแพร่ตามพื้นที่และขนาด" : "Published Solar Project Archive"}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Showing Counter */}
            <span
              aria-live="polite"
              className="inline-flex items-center rounded-full bg-[var(--muted)] px-3 py-1.5 text-xs font-bold text-[var(--accent-foreground)]"
            >
              {isTh
                ? `แสดง ${filteredProjects.length} จาก ${initialProjects.length} โครงการ`
                : `Showing ${filteredProjects.length} of ${initialProjects.length} projects`}
            </span>

            {/* Sort Dropdown */}
            <div className="relative inline-flex items-center">
              <label htmlFor="works-sort-select" className="sr-only">
                {isTh ? "จัดเรียงผลงาน" : "Sort projects"}
              </label>
              <select
                id="works-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="min-h-11 appearance-none rounded-full border border-[var(--border)] bg-[var(--background)] py-2 pl-4 pr-9 text-xs font-bold text-[var(--sd-ink)] shadow-2xs outline-none transition-colors hover:border-[var(--primary-foreground)] focus-visible:ring-2 focus-visible:ring-[#5089bf]"
              >
                <option value="newest">{isTh ? "เรียงตาม: ล่าสุด" : "Sort by: Newest"}</option>
                <option value="largest_kw">{isTh ? "เรียงตาม: ขนาด kW สูงสุด" : "Sort by: Largest kW"}</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Filter Rows */}
        <div className="mt-5 space-y-4">
          {/* Row 1: System Size */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="w-28 shrink-0 text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              {isTh ? "ขนาดระบบ (kW)" : "System Size"}:
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={isTh ? "ตัวกรองขนาดระบบ" : "Filter by system size"}
            >
              {SIZE_FILTERS.map((item) => {
                const isActive = sizeFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSizeFilter(item.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-full px-3.5 py-2 text-xs font-black transition-all duration-200 touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]",
                      isActive
                        ? "bg-[var(--primary)] text-[var(--sd-ink)] shadow-xs"
                        : "bg-[var(--background)] text-[var(--sd-text-secondary)] hover:bg-[var(--muted)]",
                    )}
                  >
                    {isTh ? item.labelTh : item.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Province & Installation Type */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <span className="w-28 shrink-0 text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
              {isTh ? "พื้นที่ / ประเภท" : "Region / Type"}:
            </span>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={isTh ? "ตัวกรองพื้นที่และประเภท" : "Filter by region and type"}
            >
              {REGION_FILTERS.map((item) => {
                const isActive = regionFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRegionFilter(item.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-full px-3.5 py-2 text-xs font-black transition-all duration-200 touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]",
                      isActive
                        ? "bg-[var(--primary)] text-[var(--sd-ink)] shadow-xs"
                        : "bg-[var(--background)] text-[var(--sd-text-secondary)] hover:bg-[var(--muted)]",
                    )}
                  >
                    {isTh ? item.labelTh : item.labelEn}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {projectLoadError ? (
        <SolarStatePanel
          kind="error"
          title={isTh ? "เปิดรายละเอียดผลงานไม่สำเร็จ" : "This case study could not be opened"}
          description={
            isTh
              ? "ข้อมูลโครงการยังโหลดไม่ครบ ลองอีกครั้งเพื่อเปิดรายละเอียดบ้านหลังนี้"
              : "The project details did not finish loading. Try again to open this installation case study."
          }
          soliaAlt={
            isTh
              ? "โซเลียกำลังช่วยเปิดรายละเอียดผลงานติดตั้ง"
              : "Solia helping reopen the installation case study"
          }
          action={
            failedProject ? (
              <button
                type="button"
                className="solar-ui-secondary rounded-full px-4 py-2.5 text-xs font-bold"
                onClick={() => void handleProjectSelect(failedProject)}
              >
                {isTh ? "ลองอีกครั้ง" : "Try again"}
              </button>
            ) : undefined
          }
        />
      ) : null}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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
          title={isTh ? "ยังไม่มีผลงานในเงื่อนไขนี้" : "No installations match this filter"}
          description={
            isTh
              ? "ลองเปลี่ยนขนาดระบบหรือพื้นที่เพื่อดูผลงานจริงของ SolarDream"
              : "Try another size or region filter to browse more real SolarDream installations."
          }
          soliaAlt={
            isTh
              ? "โซเลียกำลังช่วยเลือกหมวดผลงานติดตั้ง"
              : "Solia helping choose another installation category"
          }
        />
      ) : null}

      {/* Bottom Conversion Banner linking to /wizard */}
      <section
        aria-labelledby="works-conversion-heading"
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--sd-card)] via-[var(--background)] to-[var(--primary)]/20 p-8 shadow-sm sm:p-10 lg:p-12"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--accent-foreground)]">
              <Zap className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span>{isTh ? "จำลองระบบสำหรับบ้านคุณ" : "Ready For Solar?"}</span>
            </span>
            <h2
              id="works-conversion-heading"
              className="mt-4 text-2xl font-black tracking-tight text-[var(--sd-ink)] sm:text-3xl lg:text-4xl"
            >
              {isTh
                ? "พร้อมประเมินศักยภาพโซลาร์สำหรับบ้านคุณหรือยัง?"
                : "Inspired by these installations? Calculate your roof potential in 2 minutes."}
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-[var(--sd-text-secondary)] sm:text-base">
              {isTh
                ? "ใช้ระบบ Solar Sizer Wizard เพื่อคำนวณขนาดระบบที่เหมาะสม ค่าไฟที่ประหยัดได้ต่อเดือน และระยะเวลาคืนทุนโดยประมาณแบบเรียลไทม์"
                : "Discover your home's tailored solar system size, monthly savings forecast, and estimated payback period with our instant System Simulator."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col lg:items-end justify-center gap-4">
            <Link
              href={`/${locale}/wizard`}
              className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-[var(--sd-ink)] px-7 py-3 text-sm font-black text-white shadow-md transition-all hover:bg-[var(--primary-foreground)] active:scale-95"
            >
              <span>{isTh ? "ประเมินระบบของฉัน ↗" : "Simulate My Solar System ↗"}</span>
            </Link>
            <Link
              href={`/${locale}/catalog`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-white px-6 py-3 text-xs font-bold text-[var(--sd-ink)] shadow-2xs transition-colors hover:bg-[var(--muted)]"
            >
              <span>{isTh ? "ดูแพ็กเกจทั้งหมด" : "Browse Solar Packages"}</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <ProjectDetailModal
        project={selectedProject}
        locale={locale}
        onClose={handleModalClose}
      />
    </div>
  );
}
