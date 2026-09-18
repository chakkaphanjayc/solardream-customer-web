import type { ReactNode } from "react";

import {
  SoliaGuide as CanonicalSoliaGuide,
  type SoliaPose,
} from "@/components/brand/solia-scenes";

type LegacySoliaGuideProps = {
  message: ReactNode;
  pose?: string;
  position?: "left" | "right";
  className?: string;
};

const LEGACY_POSES: Readonly<Record<string, SoliaPose>> = {
  "solia-blueprint.png": "blueprint",
  "solia-blueprint.webp": "blueprint",
  "solia-greeting.png": "greeting",
  "solia-greeting.webp": "greeting",
  "solia-miffed.png": "miffed",
  "solia-miffed.webp": "miffed",
  "solia-pointing.png": "pointing",
  "solia-pointing.webp": "pointing",
  "solia-presenting.png": "presenting",
  "solia-presenting.webp": "presenting",
  "solia-thinking.png": "thinking",
  "solia-thinking.webp": "thinking",
};

function resolveLegacyAsset(pose: string) {
  if (pose.startsWith("/")) return pose;
  return LEGACY_POSES[pose] ? undefined : `/asset/${pose}`;
}

/**
 * Compatibility entry point for older imports. All new route work should
 * import the typed scene contract from `brand/solia-scenes` directly.
 */
export default function SoliaGuide({
  message,
  pose = "solia-presenting.png",
  position = "left",
  className,
}: LegacySoliaGuideProps) {
  const mappedPose = LEGACY_POSES[pose] ?? "presenting";

  return (
    <CanonicalSoliaGuide
      alt="Solia smart assistant"
      assetSrc={resolveLegacyAsset(pose)}
      className={className}
      imageSizes="112px"
      message={message}
      pose={mappedPose}
      position={position}
      size="standard"
    />
  );
}
