"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const subscribeToMount = () => () => undefined;
const getMountedSnapshot = () => true;
const getServerSnapshot = () => false;
const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return typeof window !== "undefined" && window.matchMedia(reducedMotionQuery).matches;
}

type BlurTextProps = Readonly<{
  text: string;
  className?: string;
  variant?: Variants;
  duration?: number;
  delay?: number;
  stagger?: number;
  direction?: "top" | "bottom";
  animateBy?: "words" | "letters";
  as?: React.ElementType;
}>;

export default function BlurText({
  text,
  className,
  duration = 0.5,
  delay = 0,
  stagger = 0.08,
  direction = "bottom",
  animateBy = "words",
  as: Component = "p",
}: BlurTextProps) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
  const mounted = useSyncExternalStore(subscribeToMount, getMountedSnapshot, getServerSnapshot);

  if (!mounted) {
    return <Component className={className}>{text}</Component>;
  }

  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  const defaultVariants: Variants = {
    hidden: {
      filter: reducedMotion ? "none" : "blur(12px)",
      opacity: 0,
      y: reducedMotion ? 0 : direction === "top" ? -24 : 24,
    },
    visible: (i: number) => ({
      filter: "blur(0px)",
      opacity: 1,
      y: 0,
      transition: {
        duration,
        delay: delay + i * stagger,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  };

  return (
    <Component
      ref={ref}
      className={cn("inline-flex flex-wrap gap-[0.25em]", className)}
    >
      {elements.map((element, i) => (
        <motion.span
          key={`${element}-${i}`}
          custom={i}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={defaultVariants}
          className="inline-block"
        >
          {element === " " ? "\u00A0" : element}
        </motion.span>
      ))}
    </Component>
  );
}
