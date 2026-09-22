"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState, type ReactNode } from "react";

import styles from "./editorial-motion-shell.module.css";

type EditorialMotionShellProps = Readonly<{
  children: ReactNode;
  preloaderSystemLabel: string;
  preloaderLabel: string;
}>;

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function useReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const next = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
      setProgress(Math.min(1, Math.max(0, next)));
    };

    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

function useTiltCards(reducedMotion: boolean) {
  useEffect(() => {
    if (reducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-solar-tilt]"),
    );
    const cleanups = cards.map((card) => {
      let frame: number | null = null;
      let bounds: DOMRect | null = null;
      let pointerX = 0;
      let pointerY = 0;

      const applyTilt = () => {
        frame = null;
        if (!bounds) return;

        const x = (pointerX - bounds.left) / bounds.width - 0.5;
        const y = (pointerY - bounds.top) / bounds.height - 0.5;
        card.style.setProperty("--solar-tilt-x", `${(y * -5).toFixed(2)}deg`);
        card.style.setProperty("--solar-tilt-y", `${(x * 5).toFixed(2)}deg`);
        card.dataset.tiltActive = "true";
      };

      const handleEnter = () => {
        bounds = card.getBoundingClientRect();
        card.style.transition = "transform 180ms ease-out";
      };

      const handleMove = (event: PointerEvent) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (frame === null) frame = window.requestAnimationFrame(applyTilt);
      };

      const handleLeave = () => {
        if (frame !== null) window.cancelAnimationFrame(frame);
        frame = null;
        bounds = null;
        card.dataset.tiltActive = "false";
        card.style.removeProperty("--solar-tilt-x");
        card.style.removeProperty("--solar-tilt-y");
        card.style.transition = "transform 420ms cubic-bezier(0.16, 1, 0.3, 1)";
        card.style.removeProperty("transform");
      };

      card.addEventListener("pointerenter", handleEnter);
      card.addEventListener("pointermove", handleMove);
      card.addEventListener("pointerleave", handleLeave);

      return () => {
        if (frame !== null) window.cancelAnimationFrame(frame);
        card.removeEventListener("pointerenter", handleEnter);
        card.removeEventListener("pointermove", handleMove);
        card.removeEventListener("pointerleave", handleLeave);
        card.dataset.tiltActive = "false";
        card.style.removeProperty("--solar-tilt-x");
        card.style.removeProperty("--solar-tilt-y");
        card.style.removeProperty("transition");
        card.style.removeProperty("transform");
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [reducedMotion]);
}

function useLenis(reducedMotion: boolean) {
  useEffect(() => {
    if (reducedMotion) return;

    const lenis = new Lenis({
      autoRaf: false,
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.95,
    });
    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = window.requestAnimationFrame(raf);
    };

    frame = window.requestAnimationFrame(raf);
    return () => {
      window.cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reducedMotion]);
}

export default function EditorialMotionShell({
  children,
  preloaderSystemLabel,
  preloaderLabel,
}: EditorialMotionShellProps) {
  const reducedMotion = useReducedMotionPreference();
  const readingProgress = useReadingProgress();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [preloaderComplete, setPreloaderComplete] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useLenis(reducedMotion);
  useTiltCards(reducedMotion);

  useEffect(() => {
    startTimeRef.current = performance.now();
    let frame = 0;
    const duration = reducedMotion ? 80 : 1250;

    const tick = (now: number) => {
      const start = startTimeRef.current ?? now;
      const next = Math.min(100, Math.round(((now - start) / duration) * 100));
      setLoadingProgress(next);
      if (next < 100) {
        frame = window.requestAnimationFrame(tick);
      } else {
        setPreloaderComplete(true);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return (
    <>
      <div
        className={styles.readingBar}
        aria-hidden="true"
        style={{ transform: `scaleX(${readingProgress})` }}
      />
      <div className={styles.motionShell}>{children}</div>
      <div
        className={`${styles.preloader} ${preloaderComplete ? styles.preloaderComplete : ""}`}
        role="status"
        aria-live="polite"
        aria-label={preloaderLabel}
        aria-hidden={preloaderComplete}
      >
        <div className={styles.preloaderPanel}>
          <div className={styles.preloaderTopline}>
            <span>{preloaderSystemLabel}</span>
            <strong>{String(loadingProgress).padStart(3, "0")}%</strong>
          </div>
          <div className={styles.preloaderRule}>
            <span style={{ transform: `scaleX(${loadingProgress / 100})` }} />
          </div>
          <p>{preloaderLabel}</p>
        </div>
      </div>
    </>
  );
}
