"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useTranslations } from "next-intl";
import { SoliaGuide } from "@/components/brand/solia-scenes";

type BudgetOption = Readonly<{
  label: string;
  value: string;
}>;

export default function ContactForm() {
  const t = useTranslations("ContactForm");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const budgetOptions: readonly BudgetOption[] = [
    { label: t("budget.placeholder"), value: "" },
    { label: t("budget.tier1"), value: "10-25" },
    { label: t("budget.tier2"), value: "25-50" },
    { label: t("budget.tier3"), value: "50-100" },
    { label: t("budget.tier4"), value: "100-plus" },
  ];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      event.currentTarget.reset();
      setDetails("");
    }, 650);
  };

  useEffect(() => {
    const form = formRef.current;
    if (!form || submitted) return;

    const fields = gsap.utils.toArray<HTMLElement>("[data-contact-field]", form);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context = gsap.context(() => {
      gsap.fromTo(
        fields,
        {
          autoAlpha: 0,
          y: prefersReducedMotion ? 0 : 18,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.08 : 0.48,
          stagger: prefersReducedMotion ? 0 : 0.07,
          ease: prefersReducedMotion ? "none" : "expo.out",
        },
      );
    }, form);

    return () => context.revert();
  }, [submitted]);

  useEffect(() => {
    const success = successRef.current;
    if (!success || !submitted) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context = gsap.context(() => {
      gsap.fromTo(
        success,
        {
          autoAlpha: 0,
          y: prefersReducedMotion ? 0 : 16,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.12 : 0.5,
          ease: prefersReducedMotion ? "none" : "expo.out",
        },
      );
    }, success);

    return () => context.revert();
  }, [submitted]);

  if (submitted) {
    return (
      <div
        ref={successRef}
        className="rounded-[28px] border border-[rgba(60,86,122,0.18)] bg-[var(--accent)] p-8 shadow-sm sm:p-10"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(60,86,122,0.14)] bg-white/80 px-3.5 py-1 text-xs font-bold text-[var(--accent-foreground)] shadow-xs">
          <span className="size-2 rounded-full bg-[#06C755] animate-pulse" />
          {t("success.responseTimeBadge")}
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--sd-ink)]">
          {t("success.title")}
        </h2>
        <p className="mt-3 max-w-md text-sm font-medium leading-6 text-[var(--sd-text-secondary)]">
          {t("success.description")}
        </p>

        <div className="mt-8 flex items-center gap-5 rounded-2xl border border-[rgba(60,86,122,0.14)] bg-white/90 p-4 shadow-xs">
          <SoliaGuide
            pose="pointing"
            alt={t("success.soliaAlt")}
            className="h-24 w-20 shrink-0"
            imageSizes="80px"
            message={t("success.soliaMessage")}
            speechBubbleClassName="rounded-xl border border-[rgba(60,86,122,0.12)] bg-[var(--background)] p-3 text-xs font-semibold leading-5 text-[var(--sd-ink)]"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setDetails("");
          }}
          className="solar-ui-primary mt-8 rounded-full px-6 py-3 text-sm font-bold active:scale-95"
        >
          {t("success.sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      data-analytics-form="contact_form"
      data-analytics-submit-event="support_request_submitted"
      className="space-y-6"
    >
      <div data-contact-field>
        <label htmlFor="name" className="text-sm font-semibold text-[var(--sd-ink)]">
          {t("fields.name")}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          className="mt-2 w-full rounded-2xl border border-[rgba(60,86,122,0.18)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-text-secondary)]/50 focus:border-[var(--primary-foreground)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]"
          placeholder={t("placeholders.name")}
        />
      </div>

      <div data-contact-field>
        <label htmlFor="email" className="text-sm font-semibold text-[var(--sd-ink)]">
          {t("fields.email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 w-full rounded-2xl border border-[rgba(60,86,122,0.18)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-text-secondary)]/50 focus:border-[var(--primary-foreground)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]"
          placeholder="you@company.com"
        />
      </div>

      <div data-contact-field>
        <label htmlFor="company" className="text-sm font-semibold text-[var(--sd-ink)]">
          {t("fields.company")}
        </label>
        <input
          id="company"
          name="company"
          type="text"
          autoComplete="organization"
          className="mt-2 w-full rounded-2xl border border-[rgba(60,86,122,0.18)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-text-secondary)]/50 focus:border-[var(--primary-foreground)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]"
          placeholder={t("placeholders.company")}
        />
      </div>

      <div data-contact-field>
        <label htmlFor="budget" className="text-sm font-semibold text-[var(--sd-ink)]">
          {t("fields.budget")}
        </label>
        <select
          id="budget"
          name="budget"
          required
          defaultValue=""
          className="mt-2 w-full rounded-2xl border border-[rgba(60,86,122,0.18)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition focus:border-[var(--primary-foreground)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]"
        >
          {budgetOptions.map((option) => (
            <option key={option.value || "empty"} value={option.value} className="bg-white text-[var(--sd-ink)]">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div data-contact-field>
        <div className="flex items-center justify-between">
          <label htmlFor="details" className="text-sm font-semibold text-[var(--sd-ink)]">
            {t("fields.details")}
          </label>
          <span className="text-xs font-semibold text-[var(--sd-text-secondary)]">
            {details.length}/500
          </span>
        </div>
        <textarea
          id="details"
          name="details"
          required
          maxLength={500}
          rows={5}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          className="mt-2 w-full resize-none rounded-2xl border border-[rgba(60,86,122,0.18)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-text-secondary)]/50 focus:border-[var(--primary-foreground)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]"
          placeholder={t("placeholders.details")}
        />
      </div>

      <div data-contact-field>
        <button
          type="submit"
          disabled={submitting}
          className="solar-ui-primary min-h-12 rounded-full px-8 text-sm font-bold shadow-xs active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          {submitting ? t("sending") : t("send")}
        </button>
      </div>
    </form>
  );
}
