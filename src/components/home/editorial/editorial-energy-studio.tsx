"use client";

import { useState } from "react";
import { FiArrowRight, FiCreditCard, FiHome, FiSun, FiZap } from "react-icons/fi";
import type { IconType } from "react-icons";

import { EnergyLine } from "@/components/brand/energy-line";
import { SoliaScene } from "@/components/brand/solia-scenes";

import styles from "./solar-editorial-home.module.css";

export type StudioStepId = "bill" | "home" | "sun" | "system";

type StudioStepLabels = Readonly<{
  id: StudioStepId;
  label: string;
  title: string;
  description: string;
}>;

export type EditorialEnergyStudioLabels = Readonly<{
  eyebrow: string;
  status: string;
  canvasLabel: string;
  insightLabel: string;
  controlsLabel: string;
  mascotAlt: string;
  steps: readonly [StudioStepLabels, StudioStepLabels, StudioStepLabels, StudioStepLabels];
}>;

type EditorialEnergyStudioProps = Readonly<{
  labels: EditorialEnergyStudioLabels;
}>;

const STEP_ICONS: Record<StudioStepId, IconType> = {
  bill: FiCreditCard,
  home: FiHome,
  sun: FiSun,
  system: FiZap,
};

export default function EditorialEnergyStudio({ labels }: EditorialEnergyStudioProps) {
  const [activeStep, setActiveStep] = useState<StudioStepId>(labels.steps[0].id);
  const activeStepLabels = labels.steps.find((step) => step.id === activeStep) ?? labels.steps[0];
  const activeIndex = labels.steps.findIndex((step) => step.id === activeStep);
  const progress = Math.max(0, activeIndex) / (labels.steps.length - 1);

  return (
    <div
      className={styles.lifestyleMedia}
      data-studio-active={activeStep}
      data-studio-progress={progress.toFixed(2)}
    >
      <div className={styles.studioHeader}>
        <span>{labels.eyebrow}</span>
        <span className={styles.studioStatus}>
          <span aria-hidden="true" />
          {labels.status}
        </span>
      </div>

      <div className={styles.studioCanvas} role="group" aria-label={labels.canvasLabel}>
        <span className={styles.studioGrid} aria-hidden="true" />
        <EnergyLine className={styles.studioEnergyLine} />
        <div className={styles.studioSun} aria-hidden="true">
          <FiSun />
        </div>
        <svg className={styles.studioDiagram} viewBox="0 0 700 420" aria-hidden="true">
          <path className={styles.studioDiagramTrack} d="M82 92C208 96 238 226 350 226s145-132 267-98" />
          <path className={styles.studioDiagramProgress} d="M82 92C208 96 238 226 350 226s145-132 267-98" />
          <path className={styles.studioHouseRoof} d="m208 270 112-80 116 80-16 22H224Z" />
          <path className={styles.studioHouseBody} d="M238 272h166v108H238Z" />
          <path className={styles.studioHousePanel} d="m266 264 67-48 73 48-67 47Z" />
          <path className={styles.studioHouseWindow} d="M263 311h34v33h-34zM346 311h34v33h-34z" />
          <path className={styles.studioPanelNode} d="M532 256h82v50h-82z" />
          <path className={styles.studioPanelCell} d="M546 267h14v14h-14zM565 267h14v14h-14zM584 267h14v14h-14zM546 286h14v14h-14zM565 286h14v14h-14zM584 286h14v14h-14z" />
          <circle className={styles.studioDiagramNode} cx="82" cy="92" r="9" />
          <circle className={styles.studioDiagramNode} cx="350" cy="226" r="9" />
          <circle className={styles.studioDiagramNode} cx="617" cy="128" r="9" />
        </svg>

        <span className={styles.studioSignalLabel}>{activeStepLabels.label}</span>
        <SoliaScene
          className={styles.studioMascot}
          imageClassName={styles.studioMascotImage}
          imageSizes="(max-width: 900px) 48vw, 280px"
          layer="foreground"
          pose="thinking"
          position="right"
          size="standard"
          state="guiding"
          alt={labels.mascotAlt}
        />
        <div className={styles.studioInsight} aria-live="polite">
          <span>{labels.insightLabel}</span>
          <strong>{activeStepLabels.title}</strong>
          <p>{activeStepLabels.description}</p>
        </div>
      </div>

      <div className={styles.studioControls} role="group" aria-label={labels.controlsLabel}>
        {labels.steps.map((step) => {
          const Icon = STEP_ICONS[step.id];
          const isActive = step.id === activeStep;

          return (
            <button
              aria-pressed={isActive}
              className={isActive ? styles.studioControlActive : styles.studioControl}
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              type="button"
            >
              <Icon aria-hidden="true" />
              <span>
                <small>{step.label}</small>
                <strong>{step.title}</strong>
              </span>
              <FiArrowRight aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
