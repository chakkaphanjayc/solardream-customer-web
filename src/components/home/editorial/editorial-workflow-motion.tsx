"use client";

import type { PropsWithChildren } from "react";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import styles from "./solar-editorial-home.module.css";

gsap.registerPlugin(ScrollTrigger);

type EditorialWorkflowMotionProps = PropsWithChildren<Readonly<{ className?: string }>>;

/**
 * Progressive enhancement for the workflow panel. Without JavaScript all
 * steps and the connector remain visible; with it, the connector and nodes
 * reveal in the same order as the customer's journey.
 */
export default function EditorialWorkflowMotion({
  children,
  className,
}: EditorialWorkflowMotionProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = root.querySelectorAll<HTMLElement>("[data-workflow-step]");
    const progressPaths = root.querySelectorAll<SVGPathElement>("[data-energy-line-progress]");

    if (reduceMotion) {
      gsap.set(steps, { clearProps: "opacity,transform" });
      gsap.set(progressPaths, { strokeDasharray: 1, strokeDashoffset: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.set(steps, { opacity: 0.48, y: 10 });
      gsap.set(progressPaths, { strokeDasharray: 1, strokeDashoffset: 1 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 78%",
          end: "bottom 58%",
          scrub: 0.75,
        },
      });

      steps.forEach((step, index) => {
        const progress = (index + 1) / steps.length;
        timeline.to(
          step,
          { opacity: 1, y: 0, duration: 0.22, ease: "power2.out" },
          index * 0.2,
        );
        progressPaths.forEach((path) => {
          timeline.to(
            path,
            { strokeDashoffset: 1 - progress, duration: 0.22, ease: "power2.out" },
            index * 0.2 + 0.03,
          );
        });
      });
    }, root);

    return () => context.revert();
  }, []);

  return (
    <div ref={rootRef} className={`${styles.workflowMotion} ${className ?? ""}`}>
      {children}
    </div>
  );
}

