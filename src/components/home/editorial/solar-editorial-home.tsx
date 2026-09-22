import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FiArrowRight, FiArrowUpRight } from "react-icons/fi";

import { AnimeMascot } from "@/components/brand/manga-primitives";
import { resolveHeaderNavigationUrl } from "@/lib/header-navigation";
import type { PortfolioProjectListItem } from "@/types/portfolio";

import EditorialHeroMotion from "./editorial-hero-motion";
import EditorialMasterSections from "./editorial-master-sections";
import EditorialMotionShell from "./editorial-motion-shell";
import EditorialProjects from "./editorial-projects";
import EditorialRhythmNavigator from "./editorial-rhythm-navigator";
import { getMasterCopy } from "./editorial-master-copy";
import type { SolarEditorialHomeProps } from "./editorial-home.types";
import styles from "./solar-editorial-home.module.css";

function isCredibleProject(project: PortfolioProjectListItem) {
  const source = project.heroImage.trim().toLowerCase();
  return Boolean(source) && !source.includes("unsplash.com") && !source.includes("images.unsplash");
}

function EditorialArrow() {
  return <FiArrowUpRight aria-hidden="true" className={styles.arrow} />;
}

function SignatureMotif() {
  return (
    <span className={styles.signatureMotif} aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function PathwayFlow({
  label,
  steps,
}: Readonly<{ label: string; steps: readonly string[] }>) {
  return (
    <ol className={styles.pathwayFlow} aria-label={label}>
      {steps.map((step, index) => (
        <li key={`${step}-${index}`}>
          <span>{step}</span>
          {index < steps.length - 1 ? <FiArrowRight aria-hidden="true" /> : null}
        </li>
      ))}
    </ol>
  );
}

export default async function SolarEditorialHome({
  locale,
  websiteSettings,
  initialShowcaseProjects,
}: SolarEditorialHomeProps) {
  const t = await getTranslations({ locale, namespace: "HomeEditorial" });
  const wizardHref = `/${locale}/wizard`;
  const buildHref = `/${locale}/build`;
  const projects = initialShowcaseProjects.filter(isCredibleProject).slice(0, 4);
  const activeSocials = websiteSettings.socialLinks.filter((item) => item.isActive);
  const currentYear = new Date().getFullYear();
  const masterCopy = getMasterCopy(locale);

  return (
    <EditorialMotionShell
      preloaderSystemLabel={masterCopy.preloaderSystem}
      preloaderLabel={masterCopy.preloader}
    >
      <div className={styles.page} data-solar-surface="future-manga">
        <div>
          <EditorialHeroMotion
            locale={locale}
            labels={{
              sectionIndex: "01 / HERO & OVERVIEW",
              eyebrow: t("hero.eyebrow"),
              titleLineOne: t("hero.titleLineOne"),
              titleLineTwo: t("hero.titleLineTwo"),
              description: t("hero.description"),
              primaryCta: t("hero.primaryCta"),
              primaryHint: t("hero.primaryHint"),
              secondaryCta: t("hero.secondaryCta"),
              secondaryHint: t("hero.secondaryHint"),
              mediaLabel: t("hero.mediaLabel"),
              visual: {
                kicker: t("hero.visual.kicker"),
                status: t("hero.visual.status"),
                imageLabel: t("hero.visual.imageLabel"),
                home: t("hero.visual.home"),
                usage: t("hero.visual.usage"),
                roof: t("hero.visual.roof"),
                system: t("hero.visual.system"),
                tracking: t("hero.visual.tracking"),
                note: t("hero.visual.note"),
                badgeClean: t("hero.visual.badgeClean"),
                badgeStep: t("hero.visual.badgeStep"),
                mascotAlt: t("hero.visual.mascotAlt"),
              },
            }}
          />

          <EditorialMasterSections
            locale={locale}
            wizardHref={wizardHref}
            buildHref={buildHref}
            projects={projects}
          />

        <EditorialRhythmNavigator
          labels={{
            eyebrow: t("statement.eyebrow"),
            title: t("statement.title"),
            body: t("statement.body"),
            signalsLabel: t("statement.signalsLabel"),
            navigatorLabel: t("statement.navigatorLabel"),
            navigatorKicker: t("statement.navigatorKicker"),
            navigatorStatus: t("statement.navigatorStatus"),
            navigatorNote: t("statement.navigatorNote"),
            signals: [
              {
                id: "life",
                index: "01",
                nodeLabel: t("statement.signalOneTitle"),
                title: t("statement.signalOneTitle"),
                body: t("statement.signalOneBody"),
              },
              {
                id: "vision",
                index: "02",
                nodeLabel: t("statement.signalTwoTitle"),
                title: t("statement.signalTwoTitle"),
                body: t("statement.signalTwoBody"),
              },
              {
                id: "confidence",
                index: "03",
                nodeLabel: t("statement.signalThreeTitle"),
                title: t("statement.signalThreeTitle"),
                body: t("statement.signalThreeBody"),
              },
            ],
          }}
        />

        <section className={styles.pathways} aria-labelledby="pathways-title">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionMarker}>{t("pathways.eyebrow")}</p>
            <h2 id="pathways-title">{t("pathways.title")}</h2>
            <p>{t("pathways.description")}</p>
          </div>
          <div className={styles.pathwayList}>
            {(["wizard", "build"] as const).map((path) => (
              <Link
                key={path}
                href={path === "wizard" ? wizardHref : buildHref}
                className={styles.pathway}
                data-solar-tilt
              >
                <span className={styles.pathwayPortal} aria-hidden="true">
                  <span>{t(`pathways.${path}.label`)}</span>
                </span>
                <span className={styles.pathwayIndex}>{t(`pathways.${path}.index`)}</span>
                <div>
                  <p>{t(`pathways.${path}.label`)}</p>
                  <h3>{t(`pathways.${path}.title`)}</h3>
                  <span>{t(`pathways.${path}.description`)}</span>
                  <PathwayFlow
                    label={t(`pathways.${path}.flowLabel`)}
                    steps={path === "wizard"
                      ? [
                          t("pathways.wizard.steps.bill"),
                          t("pathways.wizard.steps.home"),
                          t("pathways.wizard.steps.habits"),
                          t("pathways.wizard.steps.recommendation"),
                        ]
                      : [
                          t("pathways.build.steps.size"),
                          t("pathways.build.steps.panel"),
                          t("pathways.build.steps.inverter"),
                          t("pathways.build.steps.addons"),
                        ]}
                  />
                </div>
                <strong>{t(`pathways.${path}.cta`)} <EditorialArrow /></strong>
              </Link>
            ))}
          </div>
        </section>

        {projects.length > 0 ? (
          <section id="proof" className={styles.projects} aria-labelledby="projects-title">
            <div className={styles.sectionHeading}>
              <p className={styles.sectionMarker}>{masterCopy.proof.eyebrow}</p>
              <h2 id="projects-title">{masterCopy.proof.title}</h2>
              <p>{masterCopy.proof.description}</p>
            </div>
            <EditorialProjects
              locale={locale}
              projects={projects}
              labels={{
                viewProject: t("projects.viewProject"),
                viewAll: t("projects.viewAll"),
                imageAlt: t("projects.imageAlt", { title: "{title}" }),
                systemSize: t("projects.systemSize"),
                location: t("projects.location"),
                completed: t("projects.completed"),
                telemetry: t("projects.telemetry"),
                telemetryReady: t("projects.telemetryReady"),
                monthlySavings: t("projects.monthlySavings"),
                dialog: {
                  close: t("projects.dialog.close"),
                  error: t("projects.dialog.error"),
                },
              }}
            />
          </section>
        ) : null}

        <section className={styles.closing} aria-labelledby="closing-title">
          <div className={styles.closingContent}>
            <p className={styles.sectionMarker}>{t("closing.eyebrow")}</p>
            <h2 id="closing-title">{t("closing.title")}</h2>
            <p>{t("closing.description")}</p>
            <div className={styles.closingActions}>
              <Link className={styles.primaryButton} href={wizardHref}>{t("closing.primaryCta")}</Link>
              <Link className={styles.inverseButton} href={buildHref}>{t("closing.secondaryCta")}</Link>
            </div>
          </div>
          <AnimeMascot className={styles.closingVisual} state="guiding">
            <Image
              src="/asset/solia-pointing.webp"
              alt={t("closing.mascotAlt")}
              width={520}
              height={700}
              sizes="(max-width: 900px) 42vw, 22rem"
            />
          </AnimeMascot>
        </section>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Link href={`/${locale}`}>{websiteSettings.company.companyName}</Link>
          <p>{t("footer.tagline")}</p>
          <SignatureMotif />
        </div>
        <div className={styles.footerLinks}>
          {websiteSettings.footerNavigation.map((group) => (
            <nav aria-label={group.title} key={group.title}>
              <h2>{group.title}</h2>
              {group.links.map((link) => (
                <Link key={`${group.title}:${link.href}`} href={resolveHeaderNavigationUrl(link.href, locale)}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
          <address>
            <h2>{t("footer.contact")}</h2>
            {websiteSettings.company.email ? <a href={`mailto:${websiteSettings.company.email}`}>{websiteSettings.company.email}</a> : null}
            {websiteSettings.company.phone ? <a href={`tel:${websiteSettings.company.phone}`}>{websiteSettings.company.phone}</a> : null}
            {activeSocials.map((social) => (
              <a key={`${social.platform}:${social.url}`} href={social.url} target="_blank" rel="noreferrer">
                {social.label || social.platform}
              </a>
            ))}
          </address>
        </div>
        <div className={styles.footerLegal}>
          <p>{t("footer.copyright", { year: currentYear })}</p>
          <div>
            <Link href={`/${locale}/privacy`}>{t("footer.privacy")}</Link>
            <Link href={`/${locale}/terms`}>{t("footer.terms")}</Link>
            <a href="#hero" className={styles.footerBackToTop}>
              {masterCopy.backToTop} ↑
            </a>
          </div>
        </div>
      </footer>
        </div>
    </EditorialMotionShell>
  );
}
