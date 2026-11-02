"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";

import { ChevronDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const Accordion = AccordionPrimitive.Root;

const AccordionItem = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    data-bagui="accordion-item"
    className={cn(
      "rounded-2xl bg-[var(--sd-card,#FFFFFF)] border border-[var(--border,rgba(60,86,122,0.14))] mb-3 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:shadow-[0_4px_16px_rgba(11,5,29,0.06)]",
      className,
    )}
    {...props}
  />
));
AccordionItem.displayName = AccordionPrimitive.Item.displayName;

const AccordionTrigger = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ children, className, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      data-bagui="accordion-trigger"
      className={cn(
        "group flex min-h-14 flex-1 items-center justify-between gap-4 px-6 py-4 text-left text-base font-bold text-[var(--sd-ink,#0B051D)]",
        "transition-all duration-200 ease-out hover:bg-[var(--primary)]/10",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#5089bf] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        className,
      )}
      {...props}
    >
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronDown
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-[#5089bf] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-data-[state=open]:rotate-180 motion-reduce:transition-none"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = React.forwardRef<
  React.ComponentRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ children, className, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    data-bagui="accordion-content"
    className={cn(
      "overflow-hidden text-sm text-[var(--sd-text-secondary,#282636)] data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down transition-all",
      className,
    )}
    {...props}
  >
    <div className="px-6 pb-5 pt-2 leading-relaxed border-t border-[var(--border)]/40">{children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };
