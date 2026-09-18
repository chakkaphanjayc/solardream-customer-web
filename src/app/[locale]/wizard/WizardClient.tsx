"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { cn } from "@/lib/utils";
import * as Icons from "@/components/ui/icons";
import type { IconType } from "@/components/ui/icons";
import ProgressiveImage from "@/components/ui/progressive-image";
import { useLocale, useTranslations } from "next-intl";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { SofiaCapsule } from "@/components/ui/LiquidModal";
import { trackProductEvent } from "@/lib/productAnalytics";
import type { WizardAnswers, WizardClientProps } from "@/types/wizard";
import {
  getRecommendedSolarAddonSelection,
  getSolarAddonsForDisplay,
  parseSolarAddonSelection,
  serializeSolarAddonSelection,
} from "@/lib/solarAddonSelection";
import SolarAddonsSelector from "@/components/configurator/SolarAddonsSelector";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SolarChoiceCard,
  SolarProgressStepper,
} from "@/components/ui/solar-system";
import { SolarDepth } from "@/components/ui/solar-depth";
import { GsapReveal } from "@/components/ui/GsapMotion";
import { useSmartScroll } from "@/components/ui/ScrollAutoEngine";

// Helper to dynamically render icons
const IconComponent = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => {
  const Icon = (Icons as unknown as Record<string, IconType | undefined>)[name];
  if (!Icon) return <Icons.CheckCircle2 className={className} />;
  return <Icon className={className} />;
};

export default function WizardClient({
  wizard,
  buildConfig,
}: WizardClientProps) {
  const router = useRouter();
  const t = useTranslations("WizardClient");
  const locale = useLocale();
  const isThaiLocale = locale.toLowerCase().startsWith("th");
  const wizardTitle = isThaiLocale ? t("header.title") : wizard.title;
  const { scrollTo: gsapScrollTo } = useSmartScroll();
  const currencyFormatter = new Intl.NumberFormat(
    locale === "en" ? "en-US" : "th-TH",
    {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    },
  );
  const { wizardAnswers, updateDynamicState, applyWizardToVisualizer } =
    useConfiguratorStore();
  const addonCatalog = getSolarAddonsForDisplay(buildConfig?.smartAddons);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(() => {
    const savedSelection = parseSolarAddonSelection(wizardAnswers.smartAddOns);
    return savedSelection.length > 0
      ? savedSelection
      : getRecommendedSolarAddonSelection(addonCatalog);
  });

  // Educational Tooltip Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    tooltipText?: string | null;
    tooltipImageUrl?: string | null;
  }>({ title: "" });
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasTrackedWizardStart, setHasTrackedWizardStart] = useState(false);

  const trackWizardStarted = (entryPoint: string) => {
    if (hasTrackedWizardStart) return;
    setHasTrackedWizardStart(true);
    void trackProductEvent("wizard_started", {
      entry_point: entryPoint,
      wizard_id: wizard.id,
    });
  };

  const isQuestionVisible = (
    stateKey: string,
    answersMap: WizardAnswers = wizardAnswers,
  ) => {
    if (stateKey !== "roofMaterial") return true;
    const installationType = answersMap.installationType;
    return (
      installationType === "residential" ||
      installationType === "commercial_factory"
    );
  };

  // Pre-populate SLIDER questions with default values on mount
  useEffect(() => {
    const currentAnswers = useConfiguratorStore.getState().wizardAnswers;
    wizard.steps.forEach((step) => {
      step.questions.forEach((q) => {
        if (
          q.type === "SLIDER" &&
          (currentAnswers[q.stateKey] === undefined ||
            currentAnswers[q.stateKey] === null)
        ) {
          updateDynamicState(q.stateKey, 5000);
        }
      });
    });
  }, [wizard, updateDynamicState]);

  // Check if a specific step is complete
  const isStepComplete = (stepIndex: number) => {
    const step = wizard.steps[stepIndex];
    if (!step) return false;
    return step.questions
      .filter((q) => isQuestionVisible(q.stateKey, wizardAnswers))
      .every((q) => {
        const val = wizardAnswers[q.stateKey];
        return val !== undefined && val !== null && val !== "";
      });
  };

  // Check if a specific step is unlocked
  const isStepUnlocked = (stepIndex: number) => {
    if (stepIndex === 0) return true;
    for (let i = 0; i < stepIndex; i++) {
      if (!isStepComplete(i)) return false;
    }
    return true;
  };

  const handleOptionSelect = (
    stepIndex: number,
    stateKey: string,
    value: string | number | boolean,
  ) => {
    const step = wizard.steps[stepIndex];
    const newAnswers = { ...wizardAnswers, [stateKey]: value };

    const wasComplete = step.questions
      .filter((q) => isQuestionVisible(q.stateKey, wizardAnswers))
      .every((q) => {
        const val = wizardAnswers[q.stateKey];
        return val !== undefined && val !== null && val !== "";
      });

    updateDynamicState(stateKey, value);
    trackWizardStarted("wizard_engine");
    void trackProductEvent("wizard_answer_selected", {
      wizard_id: wizard.id,
      step_index: stepIndex,
      question: stateKey,
      answer_kind: typeof value,
    });

    // Check if the step is complete with the new selection and updated answer visibility
    const isNowComplete = step.questions
      .filter((q) => isQuestionVisible(q.stateKey, newAnswers))
      .every((q) => {
        const val = newAnswers[q.stateKey];
        return val !== undefined && val !== null && val !== "";
      });

    if (isNowComplete && !wasComplete) {
      void trackProductEvent("wizard_step_completed", {
        wizard_id: wizard.id,
        step_index: stepIndex,
      });
      // Auto-scroll to next step if there is one
      const nextStep = document.getElementById(`wizard-step-${stepIndex + 1}`);
      if (nextStep) {
        // GSAP Smart Auto-Scroll with 250ms debounce — offset accounts for navbar
        gsapScrollTo(nextStep, { delay: 250 });
      }
    }
  };

  const handleNumericQuestionChange = (
    stepIndex: number,
    stateKey: string,
    rawValue: string,
  ) => {
    if (rawValue === "") {
      handleOptionSelect(stepIndex, stateKey, "");
      return;
    }

    const numericOnly = rawValue.replace(/\D/g, "");
    if (numericOnly === "") {
      handleOptionSelect(stepIndex, stateKey, "");
      return;
    }

    handleOptionSelect(
      stepIndex,
      stateKey,
      parseInt(numericOnly, 10).toString(),
    );
  };

  const handleSliderChange = (
    stepIndex: number,
    stateKey: string,
    value: number,
  ) => {
    handleOptionSelect(stepIndex, stateKey, value);
  };

  const handleGenerateRecommendation = () => {
    if (isCalculating) return;
    setIsCalculating(true);
    void trackProductEvent("wizard_completed", {
      wizard_id: wizard.id,
      step_count: wizard.steps.length,
    });
    // Map dynamic state to concrete visualizer fields
    updateDynamicState(
      "smartAddOns",
      serializeSolarAddonSelection(selectedAddonIds),
    );
    applyWizardToVisualizer();
    // Route to the wizard summary instead of visualizer
    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
      router.push(`/${locale}/wizard/summary`);
    }, 900);
  };

  // Check if all questions have been answered to enable the submit button
  const allQuestionsAnswered = wizard.steps.every((_, idx) =>
    isStepComplete(idx),
  );
  const completedStepCount = wizard.steps.filter((_, index) =>
    isStepComplete(index),
  ).length;
  const firstIncompleteStepIndex = wizard.steps.findIndex(
    (_, index) => !isStepComplete(index),
  );
  const activeStepIndex =
    firstIncompleteStepIndex === -1
      ? Math.max(0, wizard.steps.length - 1)
      : firstIncompleteStepIndex;
  const completionPercent = wizard.steps.length
    ? Math.round((completedStepCount / wizard.steps.length) * 100)
    : 0;
  const wizardJourneyCopy = isThaiLocale
    ? {
        time: "ใช้เวลาประมาณ 2–3 นาที · ไม่มีข้อผูกมัด",
        intro:
          "ตอบคำถามสั้น ๆ เพื่อให้เราเลือกขนาดระบบและแนวทางติดตั้งที่เหมาะกับบ้านของคุณ",
        progress: "ความคืบหน้า",
        complete: "เสร็จแล้ว",
        current: "ขั้นตอนถัดไป",
        locked: "ยังไม่เปิด",
        ready: "พร้อมดูระบบที่แนะนำ",
        next: "ขั้นตอนถัดไป",
        reviewTitle: "ดูระบบโซลาร์ที่เหมาะกับคุณ",
        reviewDescription:
          "เราจะสรุปขนาดระบบ อุปกรณ์ที่เหมาะสม ค่าใช้จ่าย และประมาณการประหยัดให้คุณตรวจสอบก่อนขอใบเสนอราคา",
      }
    : {
        time: "Takes about 2–3 minutes · no commitment",
        intro:
          "Answer a few questions so we can match the system size and installation approach to your home.",
        progress: "Your progress",
        complete: "Complete",
        current: "Up next",
        locked: "Locked",
        ready: "Ready to review",
        next: "Next step",
        reviewTitle: "See the solar system matched to you",
        reviewDescription:
          "We’ll summarize the system size, equipment, investment, and estimated savings for you to review before requesting a quote.",
      };

  const handleStepJump = (stepIndex: number) => {
    if (!isStepUnlocked(stepIndex)) return;
    const stepElement = document.getElementById(`wizard-step-${stepIndex}`);
    if (!stepElement) return;
    gsapScrollTo(stepElement);
  };

  return (
    <div
      className="wizard-manga solar-wizard relative mx-auto flex w-full max-w-[90rem] flex-col justify-center px-4 py-10 text-[#1C1C1A] sm:px-6 sm:py-14 lg:py-16"
      id="liquid-modal-bg-target"
      data-analytics-form="wizard"
      data-solar-motion="wizard"
    >
      <SofiaCapsule visible={isCalculating} message={t("loading.calculating")} />
      <Dialog
        isOpen={isCalculating}
        onClose={() => undefined}
        dismissible={false}
        size="sm"
        tone="light"
        ariaLabel={t("loading.calculating")}
        className="rounded-[28px] border border-[#8E8B83]/20 bg-[#F0EEE9]"
      >
        <DialogContent>
          <DialogHeader showClose={false} className="sr-only">
            <DialogTitle>{t("loading.calculating")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex min-h-64 items-center justify-center bg-[#F0EEE9] px-6 py-8">
            <div
              className="flex w-full max-w-md flex-col items-center text-center"
              role="status"
              aria-live="polite"
            >
              <SoliaGuide
                alt={locale === "th" ? "Solia กำลังคำนวณแผนพลังงานของคุณ" : "Solia calculating your home energy plan"}
                pose="energyStudio"
                className="h-40 w-32 sm:h-48 sm:w-40"
                imageSizes="160px"
              />
              <p className="mt-6 text-base font-semibold leading-7 text-[#4F7FA8]">
                {t("loading.calculating")}
              </p>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <div className="solar-wizard-layout grid w-full gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(19rem,3fr)] lg:items-start lg:gap-7">
        <div className="min-w-0">
          {/* Wizard Header */}
          <GsapReveal
            data-solar-reveal
            className="solar-route-intro mb-8 space-y-6 sm:mb-10"
            from="bottom"
          >
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="solar-route-kicker inline-flex max-w-full items-center rounded-full bg-[#DCE8F5] text-[#2E2C27] px-3.5 py-1.5 font-bold">
                  {t("header.badge")}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#E6E3DC] px-3 py-1.5 text-xs font-bold text-[#4E4B44] border border-[#8E8B83]/20">
                  {wizardJourneyCopy.time}
                </span>
              </div>
              <h1 className="font-sans max-w-[18ch] text-4xl font-bold leading-[1.05] tracking-tight text-[#1C1C1A] sm:text-5xl md:text-6xl">
                {wizardTitle}
              </h1>
              <p className="max-w-[68ch] text-base leading-7 text-[#4E4B44] sm:text-lg">
                {wizard.description || wizardJourneyCopy.intro}
              </p>
            </div>
          </GsapReveal>

      {/* Dynamic Steps Renderer */}
      <GsapReveal
        data-bagui="form"
        data-solar-reveal
        className="wizard-ui-section solar-wizard-steps overflow-hidden"
        from="bottom"
      >
        {wizard.steps.map((step, stepIndex) => (
          <section
            key={step.id}
            id={`wizard-step-${stepIndex}`}
            className={cn(
              "solar-wizard-step lg-panel scroll-mt-28 space-y-6 p-5 transition-opacity duration-200 sm:p-8 lg:p-10",
              !isStepUnlocked(stepIndex) &&
                "opacity-45 pointer-events-none select-none",
            )}
          >
            {/* Step Header */}
            <div className="solar-wizard-step-header pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="flex min-w-0 items-start gap-3 text-xl font-bold leading-snug tracking-tight text-[#1C1C1A] sm:items-center sm:text-2xl">
                  <span className="solar-wizard-step-number flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                    {stepIndex + 1}
                  </span>
                  <span className="min-w-0">
                    {t.has(`questions.steps.${step.id}.title`)
                      ? t(`questions.steps.${step.id}.title`)
                      : step.title}
                  </span>
                </h2>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold",
                    isStepComplete(stepIndex)
                      ? "bg-[#C4EED0] text-[#07522C]"
                      : isStepUnlocked(stepIndex)
                        ? "bg-[#DCE8F5] text-[#0E2336]"
                        : "bg-[#F7F6F3] text-[#8E8B83]",
                  )}
                >
                  {isStepComplete(stepIndex) ? (
                    <Icons.CheckCircle2
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  ) : isStepUnlocked(stepIndex) ? (
                    <Icons.Circle className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Icons.Lock className="size-3.5" aria-hidden="true" />
                  )}
                  {isStepComplete(stepIndex)
                    ? wizardJourneyCopy.complete
                    : isStepUnlocked(stepIndex)
                      ? wizardJourneyCopy.current
                      : wizardJourneyCopy.locked}
                </span>
              </div>
              {(step.description ||
                t.has(`questions.steps.${step.id}.description`)) && (
                <p className="mt-2 text-sm font-medium leading-6 text-[#4E4B44] sm:ml-11 sm:text-base">
                  {t.has(`questions.steps.${step.id}.description`)
                    ? t(`questions.steps.${step.id}.description`)
                    : step.description}
                </p>
              )}
            </div>

            {/* Questions within Step */}
            <div className="space-y-8 sm:pl-11">
              {step.questions.map((question) => {
                const currentValue = wizardAnswers[question.stateKey];
                if (!isQuestionVisible(question.stateKey)) return null;

                return (
                  <div key={question.id} className="space-y-4">
                    <div>
                      <div className="flex items-start gap-2">
                        <h3
                          id={`wizard-question-${question.id}`}
                          className="min-w-0 text-base font-bold leading-7 text-[#1C1C1A] sm:text-lg"
                        >
                          {t.has(`questions.${question.stateKey}.text`)
                            ? t(`questions.${question.stateKey}.text`)
                            : question.questionText}
                        </h3>
                        {(question.tooltipText || question.tooltipImageUrl) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const qText = t.has(
                                `questions.${question.stateKey}.text`,
                              )
                                ? t(`questions.${question.stateKey}.text`)
                                : question.questionText;
                              setModalData({
                                title: qText,
                                tooltipText: question.tooltipText,
                                tooltipImageUrl: question.tooltipImageUrl,
                              });
                              setModalOpen(true);
                            }}
                            aria-label={t("tooltip.moreInfo")}
                            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-1 transition-colors hover:bg-slate-100"
                            title={t("tooltip.moreInfo")}
                          >
                            <Icons.Info className="w-4 h-4 text-slate-400 hover:text-slate-800 cursor-pointer transition-colors" />
                          </button>
                        )}
                      </div>
                      {(question.helperText ||
                        t.has(`questions.${question.stateKey}.helper`)) && (
                        <p className="text-sm font-medium leading-6 text-[#475569]">
                          {t.has(`questions.${question.stateKey}.helper`)
                            ? t(`questions.${question.stateKey}.helper`)
                            : question.helperText}
                        </p>
                      )}
                    </div>

                    {/* RADIO_CARD TYPE */}
                    {question.type === "RADIO_CARD" && (
                      <div
                        role="radiogroup"
                        aria-labelledby={`wizard-question-${question.id}`}
                        className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 items-stretch"
                      >
                        {question.options.map((option) => {
                          const isSelected = currentValue === option.value;
                          const optionLabel = t.has(
                            `questions.${question.stateKey}.options.${option.value}.label`,
                          )
                            ? t(
                                `questions.${question.stateKey}.options.${option.value}.label`,
                              )
                            : option.label;
                          const optionDescription = t.has(
                            `questions.${question.stateKey}.options.${option.value}.desc`,
                          )
                            ? t(
                                `questions.${question.stateKey}.options.${option.value}.desc`,
                              )
                            : option.description;
                          const hasOptionTooltip = Boolean(
                            option.tooltipText || option.tooltipImageUrl,
                          );

                          return (
                            <div
                              key={option.id}
                              data-bagui="option"
                              className="relative h-full"
                            >
                              <SolarChoiceCard
                                selectionMode="radio"
                                label={optionLabel}
                                description={optionDescription}
                                icon={
                                  option.icon ? (
                                    <IconComponent
                                      name={option.icon}
                                      className="h-6 w-6"
                                    />
                                  ) : (
                                    <span className="h-6 w-6 rounded-full bg-slate-200" />
                                  )
                                }
                                recommended={option.isRecommended}
                                recommendedLabel={t("labels.recommended")}
                                selected={isSelected}
                                onClick={() =>
                                  handleOptionSelect(
                                    stepIndex,
                                    question.stateKey,
                                    option.value,
                                  )
                                }
                                className={cn(
                                  "solar-ui-choice--feature",
                                  hasOptionTooltip && "solar-ui-choice--has-tooltip",
                                )}
                              />

                              {hasOptionTooltip ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalData({
                                      title: optionLabel,
                                      tooltipText: option.tooltipText,
                                      tooltipImageUrl: option.tooltipImageUrl,
                                    });
                                    setModalOpen(true);
                                  }}
                                  aria-label={`${t("tooltip.moreInfo")}: ${optionLabel}`}
                                  className="absolute bottom-2 right-2 inline-flex h-11 w-11 items-center justify-center text-slate-500 transition-colors hover:bg-[#F0EEE9] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D1EA]"
                                  title={t("tooltip.moreInfo")}
                                >
                                  <Icons.Info className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* NUMBER TYPE */}
                    {question.type === "NUMBER" && (
                            <div className="wizard-ui-panel solar-wizard-input-panel p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <label className="min-w-0 flex-1">
                            <span className="sr-only">
                              {t.has(`questions.${question.stateKey}.text`)
                                ? t(`questions.${question.stateKey}.text`)
                                : question.questionText}
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              data-analytics-field={question.stateKey}
                              value={
                                typeof currentValue === "number" ||
                                typeof currentValue === "string"
                                  ? String(currentValue)
                                  : ""
                              }
                              onChange={(event) =>
                                handleNumericQuestionChange(
                                  stepIndex,
                                  question.stateKey,
                                  event.target.value,
                                )
                              }
                              placeholder="4,500"
                              className="wizard-ui-input min-h-14 w-full px-4 text-2xl font-black outline-none transition text-[#0F172A] placeholder:text-slate-400"
                            />
                          </label>
                          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#475569]">
                            THB · {t("slider.perMonth")}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* SLIDER TYPE */}
                    {question.type === "SLIDER" &&
                      (() => {
                        const min = Number(question.options[0]?.value) || 1000;
                        const max = Math.max(
                          200000,
                          Number(question.options[1]?.value) || 50000,
                        );
                        const val = Number(currentValue) || 5000;
                        const percentage = Math.min(
                          100,
                          Math.max(0, ((val - min) / (max - min)) * 100),
                        );
                        return (
                          <div className="wizard-ui-panel solar-wizard-input-panel space-y-4 p-4 sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/60 pb-3">
                              <span className="text-2xl font-black tracking-tight text-[#0F172A] sm:text-3xl xl:text-4xl">
                                {currencyFormatter.format(val)}
                              </span>
                              <div className="flex items-center gap-2">
                                <label
                                  htmlFor={`slider-num-${question.stateKey}`}
                                  className="text-xs font-bold text-[#475569] whitespace-nowrap"
                                >
                                  {locale === "th"
                                    ? "พิมพ์ระบุจำนวนเงิน:"
                                    : "Type exact amount:"}
                                </label>
                                <input
                                  id={`slider-num-${question.stateKey}`}
                                  type="number"
                                  min={min}
                                  max={1000000}
                                  step={500}
                                  value={val}
                                  onChange={(e) =>
                                    handleSliderChange(
                                      stepIndex,
                                      question.stateKey,
                                      Number(e.target.value),
                                    )
                                  }
                                  className="wizard-ui-input w-28 px-2.5 py-1.5 text-sm font-black sm:w-32"
                                />
                                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                                  {t("slider.perMonth")}
                                </span>
                              </div>
                            </div>
                            <input
                              type="range"
                              aria-label={
                                t.has(`questions.${question.stateKey}.text`)
                                  ? t(`questions.${question.stateKey}.text`)
                                  : question.questionText
                              }
                              aria-valuetext={currencyFormatter.format(val)}
                              min={min}
                              max={max}
                              step={500}
                              data-analytics-field={question.stateKey}
                              value={val}
                              onChange={(e) =>
                                handleSliderChange(
                                  stepIndex,
                                  question.stateKey,
                                  Number(e.target.value),
                                )
                              }
                              className="h-11 w-full cursor-pointer appearance-none rounded-full bg-transparent bg-center bg-no-repeat outline-none focus-visible:ring-2 focus-visible:ring-[#B7D1EA] focus-visible:ring-offset-2 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[#7CA8D0] [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-sm [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[#7CA8D0] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm"
                              style={{
                                backgroundImage: `linear-gradient(to right, #B7D1EA 0%, #B7D1EA ${percentage}%, #E2E8F0 ${percentage}%, #E2E8F0 100%)`,
                                backgroundSize: "100% 0.5rem",
                              }}
                            />
                            <div className="flex justify-between gap-3 text-[11px] font-bold tracking-wide text-slate-400 sm:text-xs">
                              <span>{currencyFormatter.format(min)}</span>
                              <span>{currencyFormatter.format(max)}</span>
                            </div>

                            {val > 30000 && (
                              <div className="flex items-center gap-2 rounded-xl border border-[#7CA8D0] bg-[#B7D1EA]/25 p-3 text-xs font-semibold text-[#2E2C27]">
                                <span>⚡</span>
                                <span>
                                  {locale === "th"
                                    ? `ค่าไฟระดับธุรกิจ/โรงงานอุตสาหกรรม (${currencyFormatter.format(val)}) — ระบบจะคำนวณกำลังผลิต kWp ขนาดใหญ่ และแสดงโหมดติดต่อวิศวกรเฉพาะทาง`
                                    : `Enterprise/Commercial level bill (${currencyFormatter.format(val)}) — Will calculate custom kWp and activate contact engineering quote mode.`}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    {/* TOGGLE TYPE (Fallback if needed) */}
                    {question.type === "TOGGLE" && (
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(currentValue)}
                          onClick={() =>
                            handleOptionSelect(
                              stepIndex,
                              question.stateKey,
                              !currentValue,
                            )
                          }
                          className={cn(
                            "solar-wizard-toggle relative h-11 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7D1EA] focus-visible:ring-offset-2",
                            currentValue ? "bg-[#B7D1EA]" : "bg-slate-300",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-2.5 h-6 w-6 rounded-full bg-white transition-transform duration-200",
                              currentValue ? "translate-x-7" : "translate-x-1",
                            )}
                          />
                        </button>
                        <span className="font-bold text-slate-700">
                          {currentValue
                            ? t("toggle.enabled")
                            : t("toggle.disabled")}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </GsapReveal>

      {/* Completion Section */}
      <SolarDepth
        className="solar-depth-panel mt-10 sm:mt-14"
        maxTilt={1.05}
        lift={1}
      >
        <section
          id="wizard-addons"
          aria-label={
            isThaiLocale ? "อุปกรณ์เสริมสำหรับระบบ" : "System add-ons"
          }
          className="solar-route-card p-5 sm:p-8"
        >
          <SolarAddonsSelector
            catalog={addonCatalog}
            selectedIds={selectedAddonIds}
            onSelectedIdsChange={(nextIds) => {
              setSelectedAddonIds(nextIds);
              updateDynamicState(
                "smartAddOns",
                serializeSolarAddonSelection(nextIds),
              );
            }}
            locale={locale}
            heading={isThaiLocale ? "อุปกรณ์เสริมสำหรับระบบ" : "System add-ons"}
            description={
              isThaiLocale
                ? "เลือกอุปกรณ์เสริมที่ต้องการรวมไว้ในการประเมินราคา สามารถเปลี่ยนตัวเลือกได้ภายหลัง"
                : "Choose optional equipment to include in your estimate. You can change these selections later."
            }
          />
        </section>
      </SolarDepth>

      <GsapReveal
        data-solar-reveal
        className="solar-wizard-completion lg-panel mt-10 p-6 text-center sm:mt-14 sm:p-8"
        from="bottom"
      >
        <div className="mx-auto max-w-2xl">
          <span className="solar-route-kicker inline-flex items-center rounded-full bg-[#DCE8F5] text-[#2E2C27] px-3.5 py-1 text-xs font-bold">
            {wizardJourneyCopy.next}
          </span>
          <h2 className="font-sans mt-2 text-2xl font-bold tracking-tight text-[#1C1C1A] sm:text-3xl">
            {wizardJourneyCopy.reviewTitle}
          </h2>
          <p
            id="wizard-completion-note"
            className="mx-auto mt-2 max-w-[62ch] text-sm font-medium leading-6 text-[#4E4B44]"
          >
            {wizardJourneyCopy.reviewDescription}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={!allQuestionsAnswered || isCalculating}
          onClick={handleGenerateRecommendation}
          aria-describedby="wizard-completion-note"
          className={cn(
            "mx-auto mt-6 w-full rounded-full px-8 py-4 text-base font-black uppercase tracking-wider transition-all active:scale-95 sm:w-auto sm:px-10",
            allQuestionsAnswered && !isCalculating
              ? "wizard-ui-primary cursor-pointer"
              : "solar-wizard-disabled cursor-not-allowed bg-slate-200 text-slate-500 shadow-none",
          )}
        >
          {t("actions.generateRecommendation")}
          <Icons.ArrowRight className="w-5 h-5 stroke-[3]" />
        </Button>
        {!allQuestionsAnswered && (
          <p className="mt-4 text-sm font-semibold text-slate-500">
            {t("validation.completeAll")}
          </p>
        )}
      </GsapReveal>

        </div>

        <GsapReveal
          as="div"
          data-solar-reveal
          className="lg:sticky lg:top-[5.5rem] lg:self-start"
          from="right"
        >
          <aside
            data-bagui="progress"
            aria-label={wizardJourneyCopy.progress}
            className="solar-wizard-progress rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 shadow-sm"
          >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4F7FA8]">
              {wizardJourneyCopy.progress}
            </p>
            <p className="text-sm font-black text-[#1C1C1A]">
              {allQuestionsAnswered
                ? wizardJourneyCopy.ready
                : `${completedStepCount}/${wizard.steps.length}`}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={wizardJourneyCopy.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionPercent}
            className="mt-3 h-2 overflow-hidden rounded-full bg-[#F7F6F3]"
          >
            <span
              className="block h-full origin-left scale-x-0 rounded-full bg-[#B7D1EA] transition-transform duration-500 ease-expo"
              style={{ transform: `scaleX(${completionPercent / 100})` }}
            />
          </div>
          <SolarProgressStepper
            className="mt-4"
            ariaLabel={wizardJourneyCopy.progress}
            items={wizard.steps.map((step, stepIndex) => ({
              id: String(stepIndex),
              label: t.has(`questions.steps.${step.id}.title`)
                ? t(`questions.steps.${step.id}.title`)
                : step.title,
              status: isStepComplete(stepIndex)
                ? "complete"
                : stepIndex === activeStepIndex
                  ? "current"
                  : isStepUnlocked(stepIndex)
                    ? "idle"
                    : "locked",
              statusLabel: isStepComplete(stepIndex)
                ? wizardJourneyCopy.complete
                : stepIndex === activeStepIndex
                  ? wizardJourneyCopy.current
                  : wizardJourneyCopy.locked,
            }))}
            onSelect={(id) => {
              const stepIndex = Number(id);
              if (Number.isInteger(stepIndex)) {
                handleStepJump(stepIndex);
              }
            }}
          />
          <div className="solar-wizard-progress-note mt-5 flex items-start gap-2.5 rounded-2xl border border-[#7CA8D0]/30 bg-[#DCE8F5] px-3.5 py-3 text-xs font-semibold leading-5 text-[#2E2C27]">
            <Icons.Info className="mt-0.5 size-4 shrink-0 text-[#4F7FA8]" aria-hidden="true" />
            <span>
              {isThaiLocale
                ? "คำตอบของคุณจะช่วยให้เราแนะนำขนาดระบบและรูปแบบติดตั้งที่เหมาะสม"
                : "Your answers help us match the system size and installation approach to your home."}
            </span>
          </div>
          <SoliaGuide
            className="solar-wizard-solia mt-5"
            imageClassName="object-contain"
            imageSizes="128px"
            pose={allQuestionsAnswered ? "greeting" : "thinking"}
            size="compact"
            alt={t("guide.alt")}
            message={
              allQuestionsAnswered ? t("guide.ready") : t("guide.progress")
            }
            speechBubbleClassName="solar-wizard-solia-callout"
          />
          </aside>
        </GsapReveal>
      </div>

      <Dialog
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        size="md"
        tone="light"
        ariaLabel={modalData.title}
        closeLabel={t("actions.close")}
        className="rounded-[28px] border border-[#8E8B83]/20 bg-[#F0EEE9]"
      >
        <DialogContent>
          <DialogHeader className="border-b border-[#8E8B83]/20 bg-[#E6E3DC]">
            <DialogTitle className="text-xl font-bold text-[#1C1C1A] md:text-2xl">
              {modalData.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {modalData.tooltipText || t("tooltip.empty")}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="bg-[#F0EEE9]">
            <div
              className={cn(
                "grid grid-cols-1 gap-6",
                modalData.tooltipImageUrl?.trim()
                  ? "md:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              <p className="whitespace-pre-line text-sm leading-7 text-[#4E4B44] md:text-base">
                {modalData.tooltipText || t("tooltip.empty")}
              </p>

              {modalData.tooltipImageUrl?.trim() ? (
                <div className="relative min-h-48 w-full overflow-hidden rounded-[20px] border border-[#8E8B83]/20 bg-[#E6E3DC]">
                  <ProgressiveImage
                    src={modalData.tooltipImageUrl}
                    alt={modalData.title}
                    fill
                    sizes="(max-width: 768px) calc(100vw - 4rem), 24rem"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter className="border-t border-[#8E8B83]/20 bg-[#E6E3DC]">
            <DialogCloseButton className="wizard-ui-primary w-full rounded-full sm:w-auto active:scale-95">
              {t("actions.close")}
            </DialogCloseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
