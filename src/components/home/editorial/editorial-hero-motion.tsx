"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { FiArrowUpRight, FiHome, FiSun, FiZap } from "react-icons/fi";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { EnergyLine } from "@/components/brand/energy-line";
import {
  HalftonePattern,
  ImpactHeadline,
  SpeechBubble,
  SpeedLines,
} from "@/components/brand/manga-primitives";
import { SoliaScene } from "@/components/brand/solia-scenes";

import styles from "./solar-editorial-home.module.css";

gsap.registerPlugin(ScrollTrigger);

export type EditorialHeroLabels = Readonly<{
  eyebrow: string;
  titleLineOne: string;
  titleLineTwo: string;
  description: string;
  primaryCta: string;
  primaryHint: string;
  secondaryCta: string;
  secondaryHint: string;
  mediaLabel: string;
  visual: Readonly<{
    kicker: string;
    status: string;
    imageLabel: string;
    home: string;
    usage: string;
    roof: string;
    system: string;
    tracking: string;
    note: string;
    mascotAlt: string;
  }>;
}>;

type EditorialHeroMotionProps = Readonly<{
  locale: string;
  labels: EditorialHeroLabels;
}>;

function EditorialArrow() {
  return <FiArrowUpRight aria-hidden="true" className={styles.arrow} />;
}

function SolarSignalGraphic({
  labels,
}: Readonly<{ labels: EditorialHeroLabels["visual"] }>) {
  return (
    <div className={styles.heroSolarGraphic} aria-hidden="true">
      <div className={styles.heroSolarSun}>
        <FiSun />
      </div>
      <svg className={styles.heroSolarDiagram} viewBox="0 0 720 520" fill="none">
        <path className={styles.heroSolarTrack} d="M96 104c126 16 144 144 270 144s160-150 280-112" />
        <path className={styles.heroSolarProgress} d="M96 104c126 16 144 144 270 144s160-150 280-112" />
        <path className={styles.heroSolarRoof} d="m190 320 170-142 178 142-26 34H216Z" />
        <path className={styles.heroSolarHouse} d="M230 322h260v142H230Z" />
        <path className={styles.heroSolarPanel} d="m276 302 80-66 84 66-80 64Z" />
        <path className={styles.heroSolarWindows} d="M268 360h42v44h-42zM394 360h42v44h-42z" />
        <path className={styles.heroSolarSystem} d="M548 266h86v74h-86z" />
        <path className={styles.heroSolarSystemLine} d="M570 284h42M570 302h42M570 320h28" />
        <circle className={styles.heroSolarNode} cx="96" cy="104" r="11" />
        <circle className={styles.heroSolarNode} cx="366" cy="248" r="11" />
        <circle className={styles.heroSolarNode} cx="646" cy="136" r="11" />
      </svg>
      <span className={`${styles.heroSolarTag} ${styles.heroSolarTagHome}`}>
        <FiHome />
        {labels.home}
      </span>
      <span className={`${styles.heroSolarTag} ${styles.heroSolarTagUsage}`}>
        <FiZap />
        {labels.usage}
      </span>
      <span className={styles.heroSolarFootnote}>{labels.tracking}</span>
    </div>
  );
}

/**
 * The hero keeps its copy and links in the server-rendered tree, then layers
 * motion on top when the browser is ready. That means a slow or blocked
 * animation bundle never removes the primary conversion path.
 */
export default function EditorialHeroMotion({ locale, labels }: EditorialHeroMotionProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mediaQuery = window.matchMedia("(min-width: 901px) and (pointer: fine)");
    const parallaxContext = gsap.matchMedia();
    const refreshOnBreakpoint = () => {
      if (mediaQuery.matches) ScrollTrigger.refresh();
    };
    const context = gsap.context(() => {
      if (reduceMotion) {
        gsap.set(root.querySelectorAll("[data-hero-copy], [data-hero-card]"), {
          clearProps: "transform,opacity",
        });
        return;
      }

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      timeline
        .fromTo(
          root.querySelectorAll<HTMLElement>("[data-hero-copy]"),
          { y: 40, opacity: 0, skewY: 3 },
          {
            y: 0,
            opacity: 1,
            skewY: 0,
            duration: 0.8,
            stagger: 0.08,
            clearProps: "transform,opacity",
          },
        )
        .fromTo(
          root.querySelectorAll<HTMLElement>("[data-hero-card]"),
          { scale: 1.08, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.9,
            stagger: 0.15,
            // Keep the transform cache alive for the independent ScrollTrigger
            // yPercent tween on these same cards.
            clearProps: "opacity",
          },
          "-=0.58",
        );

      parallaxContext.add("(min-width: 901px) and (pointer: fine)", () => {
        const outerCards = root.querySelectorAll<HTMLElement>("[data-hero-parallax]");
        outerCards.forEach((card) => {
          const yPercent = card.dataset.heroParallax === "up" ? -8 : 6;
          gsap.to(card, {
            yPercent,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.15,
              invalidateOnRefresh: true,
            },
          });
        });
      });

      mediaQuery.addEventListener("change", refreshOnBreakpoint);
    }, root);

    return () => {
      mediaQuery.removeEventListener("change", refreshOnBreakpoint);
      parallaxContext.revert();
      context.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.hero} aria-labelledby="editorial-hero-title" data-hero-root>
      <ImpactHeadline
        className={styles.heroCopy}
        eyebrowClassName={styles.heroEyebrow}
        titleClassName={styles.heroTitle}
        descriptionClassName={styles.heroDescription}
        headingId="editorial-hero-title"
        headingLevel="h1"
        eyebrow={<span data-hero-copy>{labels.eyebrow}</span>}
        title={
          <>
            <span data-hero-copy>{labels.titleLineOne}</span>
            <span data-hero-copy>{labels.titleLineTwo}</span>
          </>
        }
        description={<span data-hero-copy>{labels.description}</span>}
      >
        <div className={styles.heroActions} data-hero-copy>
          <Link className={styles.primaryAction} href={`/${locale}/wizard`}>
            <span>
              <strong>{labels.primaryCta}</strong>
              <small>{labels.primaryHint}</small>
            </span>
            <EditorialArrow />
          </Link>
          <Link className={styles.secondaryAction} href={`/${locale}/build`}>
            <span>
              <strong>{labels.secondaryCta}</strong>
              <small>{labels.secondaryHint}</small>
            </span>
            <EditorialArrow />
          </Link>
        </div>
      </ImpactHeadline>

      <figure className={styles.heroMedia} aria-label={labels.mediaLabel}>
        <HalftonePattern className={styles.heroHalftone} />
        <SpeedLines className={styles.heroSpeedLines} />
        <div className={`${styles.heroCard} ${styles.heroCardPrimary}`} data-hero-card data-hero-parallax="up">
          <SolarSignalGraphic labels={labels.visual} />
          <span className={styles.heroImageLabel} aria-hidden="true">{labels.visual.imageLabel}</span>
        </div>
        <div className={styles.heroAnalysis} aria-hidden="true">
          <span className={styles.heroAnalysisLabel}>{labels.visual.roof}</span>
          <span className={styles.heroAnalysisLabel}>{labels.visual.usage}</span>
          <EnergyLine className={styles.heroEnergyLine} />
        </div>
        <SoliaScene
          className={styles.heroMascot}
          data-hero-card
          data-hero-parallax="down"
          entranceAnimation="reveal"
          imageClassName={styles.heroMascotImage}
          imageSizes="(max-width: 900px) 52vw, 25rem"
          layer="foreground"
          pose="energyStudio"
          position="right"
          loading="eager"
          priority
          size="hero"
          state="presenting"
          alt={labels.visual.mascotAlt}
        />
        <SpeechBubble
          className={styles.heroUiPanel}
          data-hero-card
          role="group"
          aria-label={labels.visual.kicker}
        >
          <div className={styles.heroUiHeader}>
            <div>
              <span>{labels.visual.kicker}</span>
              <strong>{labels.visual.note}</strong>
            </div>
            <span className={styles.heroUiStatus}>
              <span aria-hidden="true" />
              {labels.visual.status}
            </span>
          </div>
          <div className={styles.heroUiFlow}>
            <span className={styles.heroUiNode}>{labels.visual.home}</span>
            <span className={styles.heroUiConnector} aria-hidden="true" />
            <span className={styles.heroUiNode}>{labels.visual.usage}</span>
            <span className={styles.heroUiConnector} aria-hidden="true" />
            <span className={`${styles.heroUiNode} ${styles.heroUiNodeActive}`}>{labels.visual.system}</span>
          </div>
          <div className={styles.heroUiFooter}>
            <span>{labels.visual.roof}</span>
            <strong>{labels.visual.tracking}</strong>
          </div>
        </SpeechBubble>
        <figcaption className={styles.heroMediaCaption}>{labels.mediaLabel}</figcaption>
      </figure>
    </section>
  );
}
