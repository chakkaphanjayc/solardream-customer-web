"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { isPortfolioProject, type PortfolioProjectListItem, type ProjectCaseStudy } from "@/types/portfolio";

import styles from "./klarna-home.module.css";

const ProjectDetailModal = dynamic(
  () => import("@/components/agency/sections/ProjectDetailModal"),
  { ssr: false },
);

type KlarnaProjectGridProps = Readonly<{
  locale: string;
  projects: readonly PortfolioProjectListItem[];
  viewAllLabel: string;
  viewProjectLabel: string;
  imageAltTemplate: string;
  systemSizeLabel: string;
  locationLabel: string;
  completedLabel: string;
  telemetryLabel: string;
  telemetryReadyLabel: string;
  monthlySavingsLabel: string;
  errorLabel: string;
}>;

const FALLBACK_IMAGES = [
  "/asset/home-manga/hero-solar-journey-realistic.webp",
  "/asset/home-editorial/lifestyle-home.webp",
  "/asset/home-editorial/roof-detail.webp",
  "/asset/home-editorial/hero-rooftop.webp",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function projectImageAlt(template: string, title: string) {
  return template.includes("{title}") ? template.replace("{title}", title) : `${template}: ${title}`;
}

function ProjectImage({
  project,
  alt,
  fallbackSrc,
}: Readonly<{
  project: PortfolioProjectListItem;
  alt: string;
  fallbackSrc: string;
}>) {
  const [source, setSource] = useState(project.heroImage.trim() || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  if (hasError || !project.heroImage.trim()) {
    return (
      <span className={styles.projectMedia} role="img" aria-label={alt}>
        <Image
          src={fallbackSrc}
          alt=""
          fill
          sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 42vw"
          className={styles.coverImage}
        />
      </span>
    );
  }

  return (
    <span className={styles.projectMedia}>
      <Image
        src={source}
        alt={alt}
        fill
        sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 42vw"
        className={styles.coverImage}
        onError={() => {
          if (source !== fallbackSrc) {
            setSource(fallbackSrc);
            return;
          }
          setHasError(true);
        }}
      />
    </span>
  );
}

export default function KlarnaProjectGrid({
  locale,
  projects,
  viewAllLabel,
  viewProjectLabel,
  imageAltTemplate,
  systemSizeLabel,
  locationLabel,
  completedLabel,
  telemetryLabel,
  telemetryReadyLabel,
  monthlySavingsLabel,
  errorLabel,
}: KlarnaProjectGridProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectCaseStudy | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const formatMoney = (value: number) =>
    new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 0 }).format(value);

  const openProject = async (project: PortfolioProjectListItem) => {
    if (loadingProjectId) return;
    setLoadingProjectId(project.id);
    setLoadError(null);
    try {
      const response = await fetch(`/api/portfolio?projectId=${encodeURIComponent(project.id)}`, {
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      const projectData = isRecord(payload) ? payload.project : null;
      if (!response.ok || !isPortfolioProject(projectData)) {
        setLoadError(errorLabel);
        return;
      }
      setSelectedProject(projectData);
    } catch {
      setLoadError(errorLabel);
    } finally {
      setLoadingProjectId(null);
    }
  };

  return (
    <>
      <div className={styles.projectGrid} role="group" aria-label={viewAllLabel}>
        {projects.map((project, index) => {
          const location = project.location.trim() || project.province.trim();
          const alt = projectImageAlt(imageAltTemplate, project.title);
          const fallback = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
          const loading = loadingProjectId === project.id;
          return (
            <article className={styles.projectCard} key={project.id}>
              <button
                type="button"
                className={styles.projectButton}
                onClick={() => void openProject(project)}
                disabled={loadingProjectId !== null}
                aria-busy={loading}
                aria-label={`${viewProjectLabel}: ${project.title}`}
              >
                <ProjectImage project={project} alt={alt} fallbackSrc={fallback} />
                <span className={styles.projectTelemetry} aria-hidden="true">
                    <span>
                      <small>{systemSizeLabel}</small>
                      <strong>{project.solarSizeKw} kW</strong>
                    </span>
                    {project.showFinancials && project.monthlySavingsThb > 0 ? (
                      <span>
                        <small>{monthlySavingsLabel}</small>
                        <strong>฿{formatMoney(project.monthlySavingsThb)}</strong>
                      </span>
                    ) : null}
                    <span>
                      <small>{telemetryLabel}</small>
                      <strong>{telemetryReadyLabel}</strong>
                    </span>
                  </span>
                <span className={styles.projectCopy}>
                  <span className={styles.projectTopline}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>{project.completionYear.trim()}</span>
                  </span>
                  <span className={styles.projectTitle}>{project.title}</span>
                  <span className={styles.projectDetails}>
                    <span className={styles.projectDetail}>
                      <span className={styles.projectDetailLabel}>{systemSizeLabel}</span>
                      <span>{project.solarSizeKw} kW</span>
                    </span>
                    {location ? (
                      <span className={styles.projectDetail}>
                        <span className={styles.projectDetailLabel}>{locationLabel}</span>
                        <span>{location}</span>
                      </span>
                    ) : null}
                    {project.completionYear.trim() ? (
                      <span className={styles.projectDetail}>
                        <span className={styles.projectDetailLabel}>{completedLabel}</span>
                        <span>{project.completionYear}</span>
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.projectOpen}>
                    <span>{loading ? `${viewProjectLabel}…` : viewProjectLabel}</span>
                    <span aria-hidden="true">↗</span>
                  </span>
                </span>
              </button>
            </article>
          );
        })}
      </div>

      {loadError ? <p className={styles.projectError} role="status" aria-live="polite">{loadError}</p> : null}
      <Link className={styles.proofLink} href={`/${locale}/works`}>
        {viewAllLabel} <span aria-hidden="true">↗</span>
      </Link>

      {selectedProject ? (
        <ProjectDetailModal
          project={selectedProject}
          locale={locale}
          onClose={() => setSelectedProject(null)}
        />
      ) : null}
    </>
  );
}
