import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "sd-action inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--sd-radius-md)] px-5 py-2.5 text-sm font-bold leading-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-expo-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)]/45 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.99]",
  {
    variants: {
      variant: {
        primary: "border border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)] hover:bg-[#0B5BE0] hover:-translate-y-0.5 hover:shadow-[var(--sd-shadow-2)]",
        secondary: "border border-[var(--sd-blue-600)] bg-white text-[var(--sd-blue-600)] shadow-none hover:bg-[var(--sd-soft-solar)] hover:-translate-y-0.5 hover:shadow-[var(--sd-shadow-1)]",
        tonal: "border border-[var(--sd-blue-600)] bg-[var(--sd-selected)] text-[var(--sd-ink)] shadow-none hover:bg-[var(--sd-cyan-100)] hover:-translate-y-0.5 hover:shadow-[var(--sd-shadow-1)]",
        outline: "border border-[var(--sd-line)] bg-white text-[var(--sd-ink)] shadow-none hover:border-[var(--sd-blue-500)] hover:bg-[var(--sd-soft-solar)] hover:-translate-y-0.5 hover:shadow-[var(--sd-shadow-1)]",
        quiet: "border border-transparent bg-transparent text-[var(--sd-text)] hover:border-[var(--sd-line)] hover:bg-[var(--sd-soft-solar)] hover:text-[var(--sd-blue-600)]",
        destructive: "border border-[var(--sd-danger)] bg-[var(--sd-danger)] text-white shadow-[var(--sd-shadow-1)] hover:bg-[#8F1D14] hover:-translate-y-0.5 hover:shadow-[var(--sd-shadow-2)]",
        link: "h-auto min-h-0 rounded-[var(--sd-radius-sm)] px-1 py-1 text-[var(--sd-ink)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "min-h-9 rounded-[var(--sd-radius-sm)] px-3.5 text-xs",
        default: "min-h-11",
        lg: "min-h-12 px-6 text-base",
        icon: "h-11 w-11 min-h-11 rounded-full p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const resolvedVariant = variant ?? "primary";
    const isGlassControl =
      resolvedVariant === "secondary" ||
      resolvedVariant === "outline";

    return (
      <Comp
        data-bagui="button"
        data-button-variant={resolvedVariant}
        data-liquid-glass={
          isGlassControl
            ? "control"
            : resolvedVariant === "quiet"
              ? "quiet"
              : "solid"
        }
        className={cn(buttonVariants({ variant: resolvedVariant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
