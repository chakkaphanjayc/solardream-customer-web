import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  interactive?: boolean;
  tone?: "default" | "subtle" | "dark" | "accent";
}

const cardToneClasses: Record<NonNullable<CardProps["tone"]>, string> = {
  default:
    "border border-[var(--sd-line)] bg-[var(--sd-raised)] text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]",
  subtle:
    "border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] text-[var(--sd-ink)] shadow-none",
  dark:
    "border border-white/15 bg-[var(--sd-technical)] text-white shadow-[var(--sd-shadow-2)]",
  accent:
    "border border-[var(--sd-blue-600)] bg-[var(--sd-selected)] text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]",
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ asChild = false, className, interactive = false, tone = "default", ...props }, ref) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        data-bagui="card"
        data-md-surface="card"
        data-liquid-glass={tone === "dark" ? "dark" : "surface"}
        className={cn(
          "sd-surface rounded-[var(--sd-radius-lg)] text-sm transition-[background-color,border-color,box-shadow,transform] duration-200 ease-expo-out",
          cardToneClasses[tone],
          interactive &&
            "cursor-pointer hover:-translate-y-0.5 hover:shadow-[var(--sd-shadow-2)] active:translate-y-0",
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-6 sm:p-8", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-xl font-bold leading-tight tracking-tight text-[#1C1C1A]", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm leading-6 text-[#4E4B44]", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0 sm:p-8 sm:pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0 sm:p-8 sm:pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
