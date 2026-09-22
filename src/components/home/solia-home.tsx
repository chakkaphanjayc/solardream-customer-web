import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FiArrowUpRight, FiCompass, FiSliders } from "react-icons/fi";

import { SoliaScene } from "@/components/brand/solia-scenes";

import styles from "./solia-home.module.css";

type SoliaHomeProps = Readonly<{
  locale: string;
  companyName?: string;
}>;

export default async function SoliaHome({
  locale,
  companyName = "SolarDream",
}: SoliaHomeProps) {
  const t = await getTranslations({ locale, namespace: "HomeEditorial" });
  const wizardHref = `/${locale}/wizard`;
  const buildHref = `/${locale}/build`;
  const year = new Date().getFullYear();

  return (
    <div className={styles.page} data-solar-surface="solia-home">
      <div className={styles.shell}>
        <main>
          <section className={styles.hero} aria-labelledby="solia-home-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{t("hero.eyebrow")}</p>
              <h1 id="solia-home-title" className={styles.heroTitle}>
                <span>{t("hero.titleLineOne")}</span>
                <em>{t("hero.titleLineTwo")}</em>
              </h1>
              <p className={styles.heroDescription}>{t("hero.description")}</p>
              <div className={styles.heroActions}>
                <Link className={styles.primaryAction} href={wizardHref}>
                  <span className={styles.actionLabel}>
                    <span>{t("pathways.wizard.cta")}</span>
                    <small>{t("hero.primaryHint")}</small>
                  </span>
                  <FiArrowUpRight className={styles.arrow} aria-hidden="true" />
                </Link>
                <Link className={styles.secondaryAction} href={buildHref}>
                  <span className={styles.actionLabel}>
                    <span>{t("pathways.build.cta")}</span>
                    <small>{t("hero.secondaryHint")}</small>
                  </span>
                  <FiArrowUpRight className={styles.arrow} aria-hidden="true" />
                </Link>
              </div>
              <p className={styles.heroNote}>
                <strong>Solia</strong> — {t("soliaMoment.description")}
              </p>
            </div>

            <div className={styles.heroVisual} aria-label={t("hero.mediaLabel")}>
              <div className={styles.visualPanel}>
                <div className={styles.visualTopline}>
                  <span>{t("soliaMoment.eyebrow")}</span>
                  <span>{t("hero.visual.status")}</span>
                </div>
                <div className={styles.soliaStage}>
                  <SoliaScene
                    className={styles.solia}
                    pose="energyStudio"
                    state="guiding"
                    position="center"
                    size="hero"
                    layer="foreground"
                    imageClassName={styles.soliaImage}
                    imageSizes="(max-width: 620px) 90vw, 34rem"
                    loading="eager"
                    priority
                    alt={t("soliaMoment.alt")}
                    speechBubbleClassName={styles.speechBubble}
                    speechBubbleTail="left"
                    speechBubble={
                      <>
                        <strong>Solia</strong>
                        <span>{t("soliaMoment.callout")}</span>
                      </>
                    }
                  />
                </div>
                <div className={styles.visualFoot}>
                  <span>{t("hero.visual.note")}</span>
                  <span>{t("navigation.primaryCta")} + {t("navigation.secondaryCta")}</span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.selection} aria-labelledby="solia-home-options">
            <div className={styles.selectionHeader}>
              <div>
                <p className={styles.selectionEyebrow}>{t("pathways.eyebrow")}</p>
                <h2 id="solia-home-options" className={styles.selectionTitle}>
                  {t("pathways.title")}
                </h2>
              </div>
              <p>{t("pathways.description")}</p>
            </div>

            <div className={styles.choiceGrid}>
              <Link className={`${styles.choiceCard} ${styles.choiceCardPrimary}`} href={wizardHref}>
                <div className={styles.choiceTop}>
                  <span className={styles.choiceNumber}>{t("pathways.wizard.index")}</span>
                  <span className={styles.choiceIcon} aria-hidden="true">
                    <FiCompass />
                  </span>
                </div>
                <div>
                  <h3>{t("pathways.wizard.title")}</h3>
                  <p>{t("pathways.wizard.description")}</p>
                </div>
                <div className={styles.choiceBottom}>
                  <span className={styles.choiceCta}>
                    {t("pathways.wizard.cta")}
                    <FiArrowUpRight aria-hidden="true" />
                  </span>
                </div>
              </Link>

              <Link className={styles.choiceCard} href={buildHref}>
                <div className={styles.choiceTop}>
                  <span className={styles.choiceNumber}>{t("pathways.build.index")}</span>
                  <span className={styles.choiceIcon} aria-hidden="true">
                    <FiSliders />
                  </span>
                </div>
                <div>
                  <h3>{t("pathways.build.title")}</h3>
                  <p>{t("pathways.build.description")}</p>
                </div>
                <div className={styles.choiceBottom}>
                  <span className={styles.choiceCta}>
                    {t("pathways.build.cta")}
                    <FiArrowUpRight aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </div>
          </section>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <p>© {year} {companyName}</p>
            <div className={styles.footerLinks}>
              <Link href={`/${locale}/privacy`}>{t("footer.privacy")}</Link>
              <Link href={`/${locale}/terms`}>{t("footer.terms")}</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
