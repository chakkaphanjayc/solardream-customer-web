"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { FiCheckCircle, FiCreditCard, FiHome } from "react-icons/fi";

import styles from "./klarna-home.module.css";

type SignalIcon = "bill" | "home" | "confidence";

export type KlarnaSignal = Readonly<{
  id: SignalIcon;
  index: string;
  title: string;
  body: string;
}>;

type KlarnaSignalTabsProps = Readonly<{
  eyebrow: string;
  title: string;
  body: string;
  tabsLabel: string;
  panelLabel: string;
  note: string;
  signals: readonly [KlarnaSignal, KlarnaSignal, KlarnaSignal];
}>;

const SIGNAL_ICONS = {
  bill: FiCreditCard,
  home: FiHome,
  confidence: FiCheckCircle,
} as const;

export default function KlarnaSignalTabs({
  eyebrow,
  title,
  body,
  tabsLabel,
  panelLabel,
  note,
  signals,
}: KlarnaSignalTabsProps) {
  const [activeId, setActiveId] = useState<SignalIcon>(signals[0].id);
  const tabIdPrefix = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeSignal = signals.find((signal) => signal.id === activeId) ?? signals[0];
  const tabId = (id: SignalIcon) => `${tabIdPrefix}-tab-${id}`;
  const panelId = (id: SignalIcon) => `${tabIdPrefix}-panel-${id}`;

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % signals.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + signals.length) % signals.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = signals.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextSignal = signals[nextIndex];
    setActiveId(nextSignal.id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <section id="statement" className={styles.section} aria-labelledby="customer-signal-title">
      <div className={styles.signalSection}>
        <div className={styles.signalCopy}>
          <p className={styles.sectionIndex}>{eyebrow}</p>
          <h2 id="customer-signal-title">{title}</h2>
          <p>{body}</p>
        </div>

        <div className={styles.signalPanel} role="group" aria-label={panelLabel}>
          <div className={styles.signalTabs} role="tablist" aria-label={tabsLabel} aria-orientation="horizontal">
            {signals.map((signal, index) => {
              const Icon = SIGNAL_ICONS[signal.id];
              const isActive = signal.id === activeSignal.id;
              return (
                <button
                  key={signal.id}
                  type="button"
                  role="tab"
                  id={tabId(signal.id)}
                  aria-selected={isActive}
                  aria-controls={panelId(signal.id)}
                  tabIndex={isActive ? 0 : -1}
                  className={styles.signalTab}
                  data-active={isActive}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  onClick={() => setActiveId(signal.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <span className={styles.signalTabIndex}>{signal.index}</span>
                  <Icon aria-hidden="true" />
                  <strong>{signal.title}</strong>
                </button>
              );
            })}
          </div>

          {signals.map((signal) => (
            <div
              key={signal.id}
              className={styles.signalReadout}
              id={panelId(signal.id)}
              role="tabpanel"
              aria-labelledby={tabId(signal.id)}
              tabIndex={0}
              hidden={signal.id !== activeSignal.id}
            >
              <span className={styles.signalReadoutIndex}>{signal.index}</span>
              <strong>{signal.title}</strong>
              <p>{signal.body}</p>
            </div>
          ))}
          <p className={styles.signalNote}>{note}</p>
        </div>
      </div>
    </section>
  );
}
