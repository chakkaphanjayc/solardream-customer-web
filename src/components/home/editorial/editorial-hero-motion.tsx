"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { FiArrowUpRight } from "react-icons/fi";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { EnergyLine } from "@/components/brand/energy-line";
import { HalftonePattern, ImpactHeadline, SpeedLines } from "@/components/brand/manga-primitives";
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
    badgeClean: string;
    badgeStep: string;
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
          <Image
            className={styles.heroJourneyImage}
            src="/asset/home-editorial/solar-journey-cosmic-hero.png"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 60vw"
          />
          <span className={styles.heroImageLabel} aria-hidden="true">{labels.visual.imageLabel}</span>
        </div>
        <div className={styles.heroAnalysis} aria-hidden="true">
          <span className={`${styles.heroAnalysisLabel} ${styles.heroAnalysisLabelAccent}`}>
            <span aria-hidden="true" />
            {labels.visual.badgeClean}
          </span>
          <span className={styles.heroAnalysisLabel}>
            <span aria-hidden="true" />
            {labels.visual.badgeStep}
          </span>
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
          pose="pointing"
          position="right"
          loading="eager"
          priority
          size="hero"
          state="presenting"
          alt={labels.visual.mascotAlt}
        />
        <figcaption className={styles.heroMediaCaption}>{labels.mediaLabel}</figcaption>
      </figure>
    </section>
  );
}
