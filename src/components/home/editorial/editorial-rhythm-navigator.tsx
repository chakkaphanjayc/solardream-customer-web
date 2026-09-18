"use client";

import { useState } from "react";
import { FiCheckCircle, FiCreditCard, FiHome } from "react-icons/fi";
import type { IconType } from "react-icons";

import styles from "./solar-editorial-home.module.css";

type RhythmSignalId = "life" | "vision" | "confidence";

type RhythmSignal = Readonly<{
  id: RhythmSignalId;
  index: string;
  nodeLabel: string;
  title: string;
  body: string;
}>;

export type EditorialRhythmNavigatorLabels = Readonly<{
  eyebrow: string;
  title: string;
  body: string;
  signalsLabel: string;
  navigatorLabel: string;
  navigatorKicker: string;
  navigatorStatus: string;
  navigatorNote: string;
  signals: readonly [RhythmSignal, RhythmSignal, RhythmSignal];
}>;

type EditorialRhythmNavigatorProps = Readonly<{
  labels: EditorialRhythmNavigatorLabels;
}>;

const SIGNAL_ICONS: Readonly<Record<RhythmSignalId, IconType>> = {
  life: FiCreditCard,
  vision: FiHome,
  confidence: FiCheckCircle,
};

export default function EditorialRhythmNavigator({
  labels,
}: EditorialRhythmNavigatorProps) {
  const [activeSignal, setActiveSignal] = useState<RhythmSignalId>(labels.signals[0].id);
  const selectedSignal = labels.signals.find((signal) => signal.id === activeSignal) ?? labels.signals[0];

  return (
    <section className={styles.statement} id="about" aria-labelledby="statement-title">
      <div className={styles.statementNavigator}>
        <div className={styles.statementNavigatorHeader}>
          <span>{labels.navigatorKicker}</span>
          <span className={styles.statementNavigatorStatus}>
            <span aria-hidden="true" />
            {labels.navigatorStatus}
          </span>
        </div>

        <div className={styles.constellationStage} role="group" aria-label={labels.navigatorLabel}>
          <svg className={styles.constellationMap} viewBox="0 0 640 520" aria-hidden="true">
            <path d="M114 154 244 92l152 98 126-58M244 92l58 207 94-109M302 299l-92 114 178 34 126-150" />
            <path d="M114 154 210 413M396 190l18 257M522 132l-24 168" />
            <circle cx="114" cy="154" r="8" />
            <circle cx="244" cy="92" r="8" />
            <circle cx="396" cy="190" r="8" />
            <circle cx="522" cy="132" r="8" />
            <circle cx="302" cy="299" r="8" />
            <circle cx="210" cy="413" r="8" />
            <circle cx="388" cy="447" r="8" />
            <circle cx="498" cy="300" r="8" />
          </svg>

          <span className={styles.constellationOrbit} aria-hidden="true" />
          <span className={styles.constellationOrbitSmall} aria-hidden="true" />
          <span className={styles.constellationSun} aria-hidden="true">
            <span />
          </span>

          {labels.signals.map((signal, index) => {
            const isActive = signal.id === activeSignal;
            const Icon = SIGNAL_ICONS[signal.id];

            return (
              <button
                key={signal.id}
                type="button"
                className={`${styles.constellationNode} ${styles[`constellationNode${index + 1}` as keyof typeof styles]}`}
                data-active={isActive}
                aria-pressed={isActive}
                aria-label={signal.nodeLabel}
                onClick={() => setActiveSignal(signal.id)}
              >
                <Icon aria-hidden="true" />
                <span>{signal.index}</span>
              </button>
            );
          })}

          <div className={styles.constellationReadout} aria-live="polite">
            <span>{selectedSignal.index}</span>
            <strong>{selectedSignal.title}</strong>
            <p>{selectedSignal.body}</p>
          </div>
        </div>

        <p className={styles.statementNavigatorNote}>{labels.navigatorNote}</p>
      </div>

      <div className={styles.statementContent}>
        <p className={styles.sectionMarker}>{labels.eyebrow}</p>
        <h2 id="statement-title">{labels.title}</h2>
        <p>{labels.body}</p>

        <div className={styles.statementSignals} role="group" aria-label={labels.signalsLabel}>
          {labels.signals.map((signal) => {
            const isActive = signal.id === activeSignal;
            const Icon = SIGNAL_ICONS[signal.id];

            return (
              <button
                className={styles.statementSignal}
                data-active={isActive}
                key={signal.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveSignal(signal.id)}
              >
                <span className={styles.statementSignalIndex}>{signal.index}</span>
                <span className={styles.statementSignalIcon} aria-hidden="true"><Icon /></span>
                <span>
                  <strong>{signal.title}</strong>
                  <span>{signal.body}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
