import WorksGalleryClient from "./WorksGalleryClient";
import { getPortfolioProjects } from "@/lib/portfolioShowcase";
import { toPortfolioProjectListItem } from "@/types/portfolio";
import { PageShell } from "@/components/ui/page-shell";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Solar Project Showcase | SolarDream",
  description: "Explore SolarDream's published residential solar projects, with installation photos and system details when available.",
};

type WorksPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function WorksPage({ params }: WorksPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "WorksPage" });
  const projects = await getPortfolioProjects();
  const projectListItems = projects.map(toPortfolioProjectListItem);

  return (
    <PageShell
      as="div"
      className="solar-works-page !bg-transparent !text-[var(--sd-ink)] px-4 pb-24 pt-24 font-urbanist sm:px-6 sm:pb-32 sm:pt-28 lg:px-8"
    >
      <header
        className="solar-works-hero mx-auto max-w-7xl p-5 sm:p-8 lg:p-10"
      >
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="relative">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-5 -top-5 h-20 w-20 rounded-full bg-[var(--sd-selected)]/70 blur-2xl"
            />
            <div className="relative flex flex-wrap items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em]">
              <span className="solar-works-eyebrow inline-flex items-center rounded-full px-2.5 py-1">
                {t("eyebrow")}
              </span>
              <span className="solar-works-hero-note">{t("heroNote")}</span>
            </div>
            <h1
              id="works-page-title"
              className="relative mt-5 max-w-4xl text-balance text-[clamp(3rem,8vw,6.5rem)] font-black leading-[0.92] tracking-[-0.04em] text-[var(--sd-ink)]"
            >
              {t("heroTitle")}
            </h1>
            <p className="relative mt-5 max-w-2xl text-pretty text-sm font-semibold leading-6 text-[var(--sd-text)] sm:text-base">
              {t("heroDescription")}
            </p>
          </div>

          <aside
            aria-label={t("fieldNotes")}
            className="solar-works-field-notes p-4 text-[var(--sd-ink)]"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.12em]">
              {t("fieldNotes")}
            </p>
            <p className="mt-3 text-4xl font-black leading-none">{projects.length}</p>
            <p className="mt-2 text-sm font-black">
              {t("installedHomes")}
            </p>
            <div className="solar-works-field-notes-divider mt-4 border-t pt-3 text-xs font-bold leading-5">
              {t("locations")}
            </div>
          </aside>
        </div>
      </header>

      <div className="mx-auto max-w-7xl pt-8 sm:pt-10">
        <WorksGalleryClient locale={locale} initialProjects={projectListItems} />
      </div>
    </PageShell>
  );
}
