import Image from "next/image";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

import { AnimeMascot, SpeechBubble } from "./manga-primitives";

export type SoliaPose =
  | "blueprint"
  | "energyStudio"
  | "greeting"
  | "miffed"
  | "pointing"
  | "presenting"
  | "thinking";

export type SoliaScenePosition = "center" | "inline" | "left" | "right";
export type SoliaSceneSize = "compact" | "hero" | "standard";
export type SoliaSceneLayer = "background" | "flow" | "foreground";
export type SoliaEntranceAnimation = "none" | "reveal";

const SOLIA_ASSETS: Readonly<Record<SoliaPose, string>> = {
  blueprint: "/asset/solia-blueprint.webp",
  // WebP preserves the transparent cut-out while keeping the interactive
  // Energy Studio feature light enough for mobile connections.
  energyStudio: "/asset/solia-energy-studio.webp",
  greeting: "/asset/solia-greeting.webp",
  miffed: "/asset/solia-miffed.webp",
  pointing: "/asset/solia-pointing.webp",
  presenting: "/asset/solia-presenting.webp",
  thinking: "/asset/solia-thinking.webp",
};

export type SoliaCalloutProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tail?: "bottom" | "left" | "right";
};

export function SoliaCallout({ children, className, tail = "left", ...props }: SoliaCalloutProps) {
  return (
    <SpeechBubble
      {...props}
      tail={tail}
      data-solia-callout
      className={cn("z-10", className)}
    >
      {children}
    </SpeechBubble>
  );
}

export type SoliaSceneProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  alt: string;
  pose?: SoliaPose;
  assetSrc?: string;
  state?: "presenting" | "guiding" | "celebrating";
  position?: SoliaScenePosition;
  size?: SoliaSceneSize;
  layer?: SoliaSceneLayer;
  entranceAnimation?: SoliaEntranceAnimation;
  imageClassName?: string;
  imageSizes?: string;
  loading?: "eager" | "lazy";
  priority?: boolean;
  speechBubble?: ReactNode;
  speechBubbleClassName?: string;
  speechBubbleTail?: "bottom" | "left" | "right";
  annotation?: ReactNode;
  annotationClassName?: string;
  children?: ReactNode;
};

/**
 * Purposeful Solia composition for editorial surfaces. The image remains a
 * real brand asset, whether it is an established pose or a purpose-built
 * transparent feature asset; route CSS decides scale, placement, and the
 * amount of surrounding interface so the character never becomes a generic
 * sticker.
 */
export function SoliaScene({
  alt,
  pose = "presenting",
  assetSrc,
  state = "presenting",
  position = "inline",
  size = "standard",
  layer = "foreground",
  entranceAnimation = "none",
  className,
  imageClassName,
  imageSizes = "320px",
  loading,
  priority = false,
  speechBubble,
  speechBubbleClassName,
  speechBubbleTail = "left",
  annotation,
  annotationClassName,
  children,
  ...props
}: SoliaSceneProps) {
  return (
    <div
      {...props}
      className={cn("relative", className)}
      data-solia-scene
      data-solia-pose={pose}
      data-solia-position={position}
      data-solia-size={size}
      data-solia-layer={layer}
      data-solia-entrance={entranceAnimation}
    >
      <AnimeMascot
        className="absolute inset-0"
        data-solia-character
        state={state}
      >
        <Image
          src={assetSrc ?? SOLIA_ASSETS[pose]}
          alt={alt}
          fill
          sizes={imageSizes}
          className={cn("object-contain", imageClassName)}
          loading={loading}
          priority={priority}
        />
      </AnimeMascot>

      {speechBubble ? (
        <SoliaCallout
          className={speechBubbleClassName}
          tail={speechBubbleTail}
        >
          {speechBubble}
        </SoliaCallout>
      ) : null}

      {annotation ? (
        <div className={annotationClassName} data-solia-annotation>
          {annotation}
        </div>
      ) : null}

      {children}
    </div>
  );
}

export type SoliaGuideProps = Omit<SoliaSceneProps, "speechBubble"> & {
  message?: ReactNode;
};

export function SoliaGuide({ message, ...props }: SoliaGuideProps) {
  return <SoliaScene {...props} speechBubble={message} state="guiding" />;
}

export type SoliaAssistantProps = Omit<SoliaGuideProps, "pose">;

export function SoliaAssistant({ message, ...props }: SoliaAssistantProps) {
  return <SoliaGuide {...props} message={message} pose="thinking" />;
}

export type SoliaReactionProps = Omit<SoliaSceneProps, "pose"> & {
  reaction?: Extract<SoliaPose, "greeting" | "miffed" | "presenting">;
};

export function SoliaReaction({ reaction = "greeting", ...props }: SoliaReactionProps) {
  return <SoliaScene {...props} pose={reaction} state="celebrating" />;
}
