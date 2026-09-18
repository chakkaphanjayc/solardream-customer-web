import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ImpactHeadlineProps = Readonly<{
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  headingId?: string;
  headingLevel?: "h1" | "h2";
  className?: string;
  eyebrowClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}>;

/**
 * A semantic headline primitive that keeps the high-impact type treatment
 * reusable without coupling content to a specific page layout.
 */
export function ImpactHeadline({
  eyebrow,
  title,
  description,
  children,
  headingId,
  headingLevel = "h2",
  className,
  eyebrowClassName,
  titleClassName,
  descriptionClassName,
}: ImpactHeadlineProps) {
  const Heading = headingLevel;

  return (
    <div data-manga-primitive="impact-headline" className={className}>
      {eyebrow ? <p className={eyebrowClassName}>{eyebrow}</p> : null}
      <Heading id={headingId} className={titleClassName}>
        {title}
      </Heading>
      {description ? <p className={descriptionClassName}>{description}</p> : null}
      {children}
    </div>
  );
}

export function HalftonePattern({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      aria-hidden="true"
      data-manga-primitive="halftone"
      className={cn("pointer-events-none", className)}
    />
  );
}

export function SpeedLines({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      aria-hidden="true"
      data-manga-primitive="speed-lines"
      className={cn("pointer-events-none", className)}
    />
  );
}

export type SpeechBubbleProps = HTMLAttributes<HTMLDivElement> & {
  tail?: "bottom" | "left" | "right";
};

export function SpeechBubble({
  className,
  tail = "bottom",
  ...props
}: SpeechBubbleProps) {
  return (
    <div
      {...props}
      data-manga-primitive="speech-bubble"
      data-speech-tail={tail}
      className={cn("relative", className)}
    />
  );
}

export type AnimeMascotProps = HTMLAttributes<HTMLDivElement> & {
  state?: "presenting" | "guiding" | "celebrating";
};

export function AnimeMascot({
  className,
  state = "presenting",
  ...props
}: AnimeMascotProps) {
  return (
    <div
      {...props}
      data-manga-primitive="anime-mascot"
      data-mascot-state={state}
      className={cn("relative", className)}
    />
  );
}
