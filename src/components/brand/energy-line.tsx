import type { SVGAttributes } from "react";

import { cn } from "@/lib/utils";

export type EnergyLineOrientation = "horizontal" | "vertical";

type EnergyLineProps = Omit<SVGAttributes<SVGSVGElement>, "children"> & {
  orientation?: EnergyLineOrientation;
  label?: string;
};

/**
 * SolarDream's quiet connector motif. The progress path is intentionally
 * exposed as a data attribute so a route-level animation can draw it without
 * coupling this brand primitive to a specific animation library.
 */
export function EnergyLine({
  className,
  orientation = "horizontal",
  label,
  ...props
}: EnergyLineProps) {
  const isVertical = orientation === "vertical";
  const path = isVertical
    ? "M12 2 C12 28, 12 72, 12 98"
    : "M2 12 C28 12, 72 12, 98 12";

  return (
    <svg
      {...props}
      className={cn("pointer-events-none", className)}
      data-energy-line
      data-energy-orientation={orientation}
      viewBox={isVertical ? "0 0 24 100" : "0 0 100 24"}
      fill="none"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      <path
        d={path}
        pathLength="1"
        data-energy-line-track
      />
      <path
        d={path}
        pathLength="1"
        data-energy-line-progress
      />
      <circle
        cx={isVertical ? "12" : "98"}
        cy={isVertical ? "98" : "12"}
        r="2.1"
        data-energy-line-node
      />
    </svg>
  );
}

