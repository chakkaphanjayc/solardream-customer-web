import type { SVGAttributes } from "react";

import { cn } from "@/lib/utils";

import styles from "./solar-editorial-home.module.css";

export type SolarRoofIllustrationVariant = "before" | "after";

type SolarRoofIllustrationProps = Omit<SVGAttributes<SVGSVGElement>, "children"> & {
  variant: SolarRoofIllustrationVariant;
};

/**
 * A code-native roof study for the comparison control. It keeps the interaction
 * useful without implying that an illustrative scene is a completed project.
 */
export default function SolarRoofIllustration({
  variant,
  className,
  ...props
}: SolarRoofIllustrationProps) {
  const hasPanels = variant === "after";

  return (
    <svg
      {...props}
      className={cn(styles.beforeAfterIllustration, className)}
      viewBox="0 0 900 560"
      aria-hidden="true"
      data-roof-illustration={variant}
      focusable="false"
    >
      <rect className={styles.roofSky} width="900" height="560" />
      <circle className={styles.roofSun} cx="735" cy="112" r="42" />
      <path className={styles.roofHorizon} d="M0 318C148 276 268 300 392 322c130 23 263 6 508-42v280H0Z" />
      <path className={styles.roofHouse} d="M116 376 450 168l334 208v184H116Z" />
      <path className={styles.roofFace} d="M116 376h668v184H116Z" />
      <path className={styles.roofPlane} d="m76 372 374-236 378 236-30 41-348-210-342 210Z" />
      <path className={styles.roofPlaneEdge} d="m76 372 30 41 342-210 348 210 32-41" />
      <path className={styles.roofWindow} d="M190 422h92v102h-92zM585 422h92v102h-92z" />
      <path className={styles.roofDoor} d="M386 398h94v162h-94z" />
      <path className={styles.roofPlant} d="M154 517c22-50 50-55 72 0M698 517c22-50 50-55 72 0" />
      {hasPanels ? (
        <g className={styles.roofPanels}>
          <path d="m248 316 188-116 194 116-188 115Z" />
          <path d="m283 308 155-95 160 95-156 96Z" />
          <path d="m322 285 1 79M365 258l1 80M409 231l1 81M454 226l1 81M499 254l1 80M543 281l1 79" />
          <path d="m290 307 321 0M331 281l238 0M372 256l156 0M414 232l72 0" />
          <path className={styles.roofEnergyArrow} d="M446 195c-4-44 22-82 76-98" />
          <path className={styles.roofEnergyArrowHead} d="m509 95 18 3-11 14" />
        </g>
      ) : null}
      <path className={styles.roofShadow} d="M0 540c188-54 330-44 474-12 147 33 274 27 426-25v57H0Z" />
    </svg>
  );
}
