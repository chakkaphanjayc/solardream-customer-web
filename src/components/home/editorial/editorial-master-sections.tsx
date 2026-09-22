"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FiArrowUpRight, FiCheck, FiCpu, FiShield, FiSun, FiZap } from "react-icons/fi";

import type { PortfolioProjectListItem } from "@/types/portfolio";

import { getMasterCopy, type MasterMetric, type MasterPartner } from "./editorial-master-copy";
import styles from "./editorial-master-sections.module.css";

type EditorialMasterSectionsProps = Readonly<{
  locale: string;
  wizardHref: string;
  buildHref: string;
  projects: readonly PortfolioProjectListItem[];
}>;

type MetricValueProps = Readonly<{
  metric: MasterMetric;
}>;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(reducedMotionQuery);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(reducedMotionQuery).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function MetricValue({ metric }: MetricValueProps) {
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    if (metric.value === null || !elementRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.4 },
    );

    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [metric.value]);

  useEffect(() => {
    if (!isVisible || metric.value === null) return;

    if (prefersReducedMotion) return;

    const duration = 900;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(2, -10 * progress);
      setDisplayValue(metric.value! * eased);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, metric.value, prefersReducedMotion]);

  const value = metric.value === null
    ? metric.display
    : prefersReducedMotion
      ? metric.display
    : metric.display.includes("+")
      ? `${String(Math.round(displayValue)).padStart(3, "0")}+`
      : `${String(Math.round(displayValue)).padStart(3, "0")}${metric.display.endsWith("%") ? "%" : ""}`;

  return <span ref={elementRef}>{value}</span>;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  titleId,
  dark = false,
}: Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  titleId: string;
  dark?: boolean;
}>) {
  return (
    <div className={`${styles.sectionHeader} ${dark ? styles.sectionHeaderDark : ""}`}>
      <p className={styles.sectionIndex}>{eyebrow}</p>
      <span className={styles.sectionLine} aria-hidden="true" />
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function PartnerRow({
  items,
  direction,
  label,
}: Readonly<{
  items: readonly MasterPartner[];
  direction: "left" | "right";
  label: string;
}>) {
  return (
    <div className={styles.marqueeViewport} role="group" aria-label={label}>
      <div className={`${styles.marqueeTrack} ${direction === "right" ? styles.marqueeRight : styles.marqueeLeft}`}>
        {items.map((item, index) => (
          <div className={styles.partnerItem} key={`${item.name}-${index}`}>
            <span className={styles.partnerMark} aria-hidden="true">✦</span>
            <span>
              <strong>{item.name}</strong>
              <small>{item.descriptor}</small>
            </span>
          </div>
        ))}
        <span className={styles.marqueeClone} aria-hidden="true">
          {items.map((item, index) => (
            <span className={styles.partnerItem} key={`${item.name}-clone-${index}`}>
              <span className={styles.partnerMark} aria-hidden="true">✦</span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.descriptor}</small>
              </span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

export default function EditorialMasterSections({
  locale,
  wizardHref,
  buildHref,
  projects,
}: EditorialMasterSectionsProps) {
  const copy = getMasterCopy(locale);
  const icons = [FiSun, FiShield, FiCpu] as const;

  return (
    <>
      <section id="hardware" className={styles.hardware} aria-labelledby="hardware-title">
        <div className={styles.sectionShell}>
          <SectionHeader
            titleId="hardware-title"
            eyebrow={copy.hardware.eyebrow}
            title={copy.hardware.title}
            description={copy.hardware.description}
          />
          <div className={styles.indexStatus}>
            <span className={styles.statusDot} aria-hidden="true" />
            {copy.hardware.status}
          </div>
        </div>
        <div className={styles.marqueeStack} role="group" aria-label={copy.hardware.title}>
          <PartnerRow
            items={copy.hardware.partnersLeft}
            direction="left"
            label={`${copy.hardware.status} 01`}
          />
          <PartnerRow
            items={copy.hardware.partnersRight}
            direction="right"
            label={`${copy.hardware.status} 02`}
          />
        </div>
      </section>

      <section id="impact" className={styles.impact} aria-labelledby="impact-title">
        <div className={styles.sectionShell}>
          <SectionHeader
            titleId="impact-title"
            eyebrow={copy.impact.eyebrow}
            title={copy.impact.title}
            description={copy.impact.description}
          />
          <div className={styles.metricGrid}>
            {copy.impact.metrics.map((metric, index) => (
              <article className={styles.metric} key={metric.label}>
                <span className={styles.metricIndex}>0{index + 1} / SIGNAL</span>
                <strong className={styles.metricValue}>
                  <MetricValue metric={metric} />
                </strong>
                <h3>{metric.label}</h3>
                <p>{metric.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="challenge" className={styles.challenge} aria-labelledby="challenge-title">
        <div className={styles.sectionShell}>
          <SectionHeader
            titleId="challenge-title"
            eyebrow={copy.challenge.eyebrow}
            title={copy.challenge.title}
            description={copy.challenge.description}
            dark
          />
          <div className={styles.challengeGrid}>
            <ul className={styles.challengeList}>
              {copy.challenge.items.map((item) => (
                <li key={item}>
                  <FiZap aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <aside className={styles.challengeCallout}>
              <span>{copy.challenge.calloutLabel}</span>
              <p>{copy.challenge.callout}</p>
              <Link href={wizardHref}>
                {locale === "th" ? "เริ่มจากค่าไฟของฉัน" : "Start with my bill"}
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      <section id="benefits" className={styles.benefits} aria-labelledby="benefits-title">
        <div className={styles.sectionShell}>
          <SectionHeader
            titleId="benefits-title"
            eyebrow={copy.benefits.eyebrow}
            title={copy.benefits.title}
            description={copy.benefits.description}
          />
          <div className={styles.benefitGrid}>
            {copy.benefits.items.map((item, index) => {
              const Icon = icons[index];
              return (
                <article className={styles.benefit} key={item.index} data-solar-tilt>
                  <div className={styles.benefitTopline}>
                    <span>{item.index}</span>
                    <Icon aria-hidden="true" />
                  </div>
                  <p className={styles.benefitLabel}>{item.label}</p>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
          <div className={styles.benefitFooter}>
            <span><FiCheck aria-hidden="true" /> {locale === "th" ? "ทุกขั้นตอนมีเหตุผลให้ตรวจสอบ" : "Every step has a reason you can inspect"}</span>
            <Link href={buildHref}>{locale === "th" ? "ดูทางเลือกของระบบ" : "See system pathways"} <FiArrowUpRight aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      {projects.length === 0 ? (
        <section id="proof" className={styles.proof} aria-labelledby="proof-title">
          <div className={styles.sectionShell}>
            <SectionHeader
              titleId="proof-title"
              eyebrow={copy.proof.eyebrow}
              title={copy.proof.title}
              description={copy.proof.empty}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
