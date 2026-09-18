import type { CSSProperties, ButtonHTMLAttributes, ReactNode } from "react";
import { FiArrowRight, FiCheck, FiInfo, FiLoader, FiSun } from "react-icons/fi";

import { SoliaScene, type SoliaPose } from "@/components/brand/solia-scenes";
import { cn } from "@/lib/utils";

export type SolarChoiceCardProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-checked" | "aria-pressed" | "children"
> & {
  label: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  selected?: boolean;
  recommended?: boolean;
  recommendedLabel?: ReactNode;
  selectionMode?: "button" | "radio" | "checkbox";
};

/** Shared selectable surface for Wizard, Build, catalog, and add-on choices. */
export function SolarChoiceCard({
  label,
  description,
  meta,
  icon,
  selected = false,
  recommended = false,
  recommendedLabel,
  selectionMode = "button",
  className,
  ...props
}: SolarChoiceCardProps) {
  const selectionAttributes =
    selectionMode === "radio"
      ? { role: "radio" as const, "aria-checked": selected }
      : selectionMode === "checkbox"
        ? { role: "checkbox" as const, "aria-checked": selected }
        : { "aria-pressed": selected };

  return (
    <button
      {...props}
      {...selectionAttributes}
      data-bagui="choice-card"
      data-selected={selected}
      className={cn("solar-ui-choice", className)}
      type={props.type ?? "button"}
    >
      <span className="solar-ui-choice__leading">
        {icon ? <span className="solar-ui-choice__icon" aria-hidden="true">{icon}</span> : null}
        <span className="solar-ui-choice__copy">
          <span className="solar-ui-choice__label">{label}</span>
          {description ? <span className="solar-ui-choice__description">{description}</span> : null}
        </span>
      </span>
      {recommended ? (
        <span className="solar-ui-choice__recommended">
          {recommendedLabel}
        </span>
      ) : null}
      {meta ? <span className="solar-ui-choice__meta">{meta}</span> : null}
      {selected ? <FiCheck aria-hidden="true" /> : null}
    </button>
  );
}

export type SolarDependencyNoteProps = Readonly<{
  children: ReactNode;
  tone?: "info" | "warning";
  className?: string;
}>;

/** Short, contextual explanation for a choice that depends on another option. */
export function SolarDependencyNote({
  children,
  tone = "info",
  className,
}: SolarDependencyNoteProps) {
  return (
    <span
      className={cn("solar-ui-dependency-note", className)}
      data-tone={tone}
      role="note"
    >
      <FiInfo aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

export type SolarStepperItem = Readonly<{
  id: string;
  label: ReactNode;
  description?: ReactNode;
  status?: "complete" | "current" | "idle" | "locked";
  statusLabel?: ReactNode;
}>;

type SolarProgressStepperProps = Readonly<{
  items: readonly SolarStepperItem[];
  ariaLabel: string;
  onSelect?: (id: string) => void;
  interactive?: boolean;
  className?: string;
}>;

/** Shared step language for guided and configuration journeys. */
export function SolarProgressStepper({
  items,
  ariaLabel,
  onSelect,
  interactive,
  className,
}: SolarProgressStepperProps) {
  const style = { "--solar-step-count": items.length } as CSSProperties;
  const isInteractive = interactive ?? Boolean(onSelect);

  return (
    <nav
      className={cn("solar-ui-stepper", className)}
      aria-label={ariaLabel}
      data-bagui="progress-stepper"
    >
      <ol className="solar-ui-stepper__list" style={style}>
        {items.map((item, index) => {
          const status = item.status ?? "idle";
          const isLocked = status === "locked";

          const stepContent = (
            <>
              <span className="solar-ui-stepper__index" aria-hidden="true">
                {status === "complete" ? <FiCheck /> : index + 1}
              </span>
              <span className="solar-ui-stepper__copy">
                <span className="solar-ui-stepper__label">{item.label}</span>
                {item.description ? (
                  <span className="solar-ui-stepper__description">
                    {item.description}
                  </span>
                ) : null}
                {item.statusLabel ? (
                  <span
                    className="solar-ui-stepper__status"
                    style={status === "current" ? { color: "var(--sd-navy-900)" } : undefined}
                  >
                    {item.statusLabel}
                  </span>
                ) : null}
              </span>
            </>
          );

          return (
            <li key={item.id}>
              {isInteractive ? (
                <button
                  type="button"
                  className="solar-ui-stepper__button"
                  data-state={status}
                  aria-current={status === "current" ? "step" : undefined}
                  disabled={isLocked || !onSelect}
                  onClick={() => onSelect?.(item.id)}
                >
                  {stepContent}
                </button>
              ) : (
                <div
                  className="solar-ui-stepper__button"
                  data-state={status}
                  aria-current={status === "current" ? "step" : undefined}
                  aria-disabled={isLocked || undefined}
                >
                  {stepContent}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type SolarLivePlanLabels = Readonly<{
  live: string;
  systemSize: string;
  investment: string;
  monthlySaving: string;
  profile: string;
  solution: string;
  architecture: string;
  addOns: string;
  addOnsTotal: string;
  engineeringNote: string;
  progress: string;
  stepsReady: string;
}>;

export type SolarLivePlanProgress = Readonly<{
  completedSteps: number;
  totalSteps: number;
}>;

type SolarLivePlanPanelProps = Readonly<{
  labels: SolarLivePlanLabels;
  title?: ReactNode;
  systemSize: ReactNode;
  investment: ReactNode;
  monthlySaving: ReactNode;
  profile: ReactNode;
  architecture: ReactNode;
  addOns: ReactNode;
  addOnsTotal: ReactNode;
  description?: ReactNode;
  progress?: SolarLivePlanProgress;
  action?: ReactNode;
  soliaAlt?: string;
  soliaPose?: SoliaPose;
  className?: string;
}>;

/** One canonical plan summary for Build, Summary, and quote handoff surfaces. */
export function SolarLivePlanPanel({
  labels,
  title,
  systemSize,
  investment,
  monthlySaving,
  profile,
  architecture,
  addOns,
  addOnsTotal,
  description,
  progress,
  action,
  soliaAlt,
  soliaPose = "thinking",
  className,
}: SolarLivePlanPanelProps) {
  return (
    <aside
      className={cn("solar-ui-panel solar-live-plan", className)}
      aria-label={labels.live}
      data-bagui="live-plan"
    >
      <header className="solar-live-plan__header">
        <div>
          <p className="solar-live-plan__eyebrow">{labels.live}</p>
          <h2 className="solar-live-plan__title">
            {title ?? labels.systemSize}
          </h2>
        </div>
        <span className="solar-ui-status" data-tone="success">
          {labels.live}
        </span>
      </header>

      {description ? (
        <p className="solar-live-plan__description">{description}</p>
      ) : null}

      <div className="solar-live-plan__hero">
        <div>
          <span className="solar-live-plan__label">{labels.systemSize}</span>
          <strong className="solar-live-plan__size">{systemSize}</strong>
        </div>
        <span className="solar-live-plan__sun" aria-hidden="true">
          <FiSun />
        </span>
      </div>

      <dl className="solar-live-plan__metrics">
        <div className="solar-ui-metric">
          <dt className="solar-ui-metric__label">{labels.investment}</dt>
          <dd className="solar-ui-metric__value">{investment}</dd>
        </div>
        <div className="solar-ui-metric">
          <dt className="solar-ui-metric__label">{labels.monthlySaving}</dt>
          <dd className="solar-ui-metric__value">{monthlySaving}</dd>
        </div>
      </dl>

      <section className="solar-live-plan__details-group">
        <h3>{labels.profile}</h3>
        <dl className="solar-live-plan__details">
          <div>
            <dt>{labels.solution}</dt>
            <dd>{profile}</dd>
          </div>
          <div>
            <dt>{labels.architecture}</dt>
            <dd>{architecture}</dd>
          </div>
          <div>
            <dt>{labels.addOns}</dt>
            <dd>{addOns}</dd>
          </div>
        </dl>
      </section>

      <div className="solar-live-plan__addons">
        <span>{labels.addOnsTotal}</span>
        <strong>{addOnsTotal}</strong>
      </div>

      {soliaAlt ? (
        <SoliaScene
          className="solar-live-plan__solia"
          imageClassName="solar-live-plan__solia-image"
          imageSizes="120px"
          pose={soliaPose}
          size="compact"
          state="guiding"
          alt={soliaAlt}
        />
      ) : null}

      <p className="solar-live-plan__note">
        <FiInfo aria-hidden="true" />
        {labels.engineeringNote}
      </p>

      {progress ? (
        <section className="solar-live-plan__progress" aria-label={labels.progress}>
          <div>
            <span>{labels.progress}</span>
            <strong>
              {progress.totalSteps > 0
                ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
                : 0}%
            </strong>
          </div>
          <div
            className="solar-live-plan__progress-track"
            role="progressbar"
            aria-label={labels.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              progress.totalSteps > 0
                ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
                : 0
            }
          >
            <span
              style={{
                transform: `scaleX(${progress.totalSteps > 0 ? progress.completedSteps / progress.totalSteps : 0})`,
              }}
            />
          </div>
          <small>
            {progress.completedSteps} / {progress.totalSteps} {labels.stepsReady}
          </small>
        </section>
      ) : null}

      {action ? <div className="solar-live-plan__action">{action}</div> : null}
    </aside>
  );
}

type SolarActionBarProps = Readonly<{
  summary: ReactNode;
  actions: ReactNode;
  className?: string;
}>;

/** Compact action dock that can be reused by Build, Cart, and quote flows. */
export function SolarActionBar({ summary, actions, className }: SolarActionBarProps) {
  return (
    <div className={cn("solar-ui-action-bar", className)} data-bagui="action-bar">
      <div>{summary}</div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{actions}</div>
    </div>
  );
}

export type SolarStateKind = "loading" | "empty" | "error" | "success";

type SolarStatePanelProps = Readonly<{
  kind: SolarStateKind;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  soliaAlt?: string;
  headingLevel?: 1 | 2 | 3;
  className?: string;
}>;

/** Shared recoverable state surface for customer routes. */
export function SolarStatePanel({
  kind,
  title,
  description,
  action,
  soliaAlt,
  headingLevel = 2,
  className,
}: SolarStatePanelProps) {
  const icon =
    kind === "loading" ? <FiLoader className="animate-spin" /> : kind === "success" ? <FiCheck /> : kind === "error" ? <FiInfo /> : <FiArrowRight />;
  const Heading = headingLevel === 1 ? "h1" : headingLevel === 3 ? "h3" : "h2";

  return (
    <section
      className={cn("solar-ui-state solar-ui-panel", className)}
      data-state={kind}
      role={kind === "loading" ? "status" : kind === "error" ? "alert" : undefined}
      aria-live={kind === "loading" || kind === "error" ? "polite" : undefined}
      aria-busy={kind === "loading" ? true : undefined}
    >
      {soliaAlt ? (
        <SoliaScene
          className="h-28 w-24"
          imageClassName="object-contain"
          imageSizes="96px"
          pose={kind === "success" ? "greeting" : "thinking"}
          size="compact"
          state={kind === "success" ? "celebrating" : "guiding"}
          alt={soliaAlt}
        />
      ) : (
        <span className="solar-ui-state__icon" aria-hidden="true">{icon}</span>
      )}
      <Heading className="solar-ui-state__title">{title}</Heading>
      {description ? <p className="solar-ui-state__description">{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}
