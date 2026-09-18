import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide leading-none transition-colors duration-200 ease-expo-out",
  {
    variants: {
      variant: {
        neutral: "border-[var(--sd-line)] bg-[var(--sd-soft-solar)] text-[var(--sd-text)]",
        primary: "border-[var(--sd-blue-600)]/25 bg-[var(--sd-selected)] text-[var(--sd-navy-900)]",
        success: "border-[var(--sd-success)]/25 bg-[var(--sd-success)]/10 text-[var(--sd-success)]",
        warning: "border-[var(--sd-warning)]/25 bg-[var(--sd-yellow-400)]/25 text-[var(--sd-warning)]",
        danger: "border-[var(--sd-danger)]/25 bg-[var(--sd-danger)]/10 text-[var(--sd-danger)]",
        info: "border-[var(--sd-blue-500)]/20 bg-[var(--sd-cyan-100)] text-[var(--sd-navy-900)]",
        dark: "border-white/15 bg-[var(--sd-technical)] text-white",
        outline: "border-[var(--sd-line)] bg-transparent text-[var(--sd-text)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-bagui="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
