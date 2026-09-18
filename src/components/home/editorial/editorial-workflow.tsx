import { FiActivity, FiArrowRight, FiCheckCircle, FiCompass, FiHome, FiSun } from "react-icons/fi";
import type { IconType } from "react-icons";

import { EnergyLine } from "@/components/brand/energy-line";
import { MangaPanel } from "@/components/brand/manga-panel";

import EditorialWorkflowMotion from "./editorial-workflow-motion";
import styles from "./solar-editorial-home.module.css";

type WorkflowStepLabels = Readonly<{
  index: string;
  title: string;
  description: string;
}>;

export type EditorialWorkflowLabels = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  panelTitle: string;
  panelDescription: string;
  outcome: string;
  stepOne: WorkflowStepLabels;
  stepTwo: WorkflowStepLabels;
  stepThree: WorkflowStepLabels;
  stepFour: WorkflowStepLabels;
  stepFive: WorkflowStepLabels;
}>;

type EditorialWorkflowProps = Readonly<{
  labels: EditorialWorkflowLabels;
}>;

const WORKFLOW_ICONS: readonly IconType[] = [
  FiHome,
  FiCompass,
  FiSun,
  FiActivity,
  FiCheckCircle,
];

export default function EditorialWorkflow({ labels }: EditorialWorkflowProps) {
  const steps = [
    labels.stepOne,
    labels.stepTwo,
    labels.stepThree,
    labels.stepFour,
    labels.stepFive,
  ];

  return (
    <section className={styles.workflow} id="journey" aria-labelledby="workflow-title">
      <div className={styles.workflowIntro}>
        <p className={styles.sectionMarker}>{labels.eyebrow}</p>
        <h2 id="workflow-title">{labels.title}</h2>
        <p>{labels.description}</p>
      </div>

      <EditorialWorkflowMotion>
        <MangaPanel tone="dark" className={styles.workflowPanel}>
          <div className={styles.workflowPanelTop}>
            <div>
              <p>{labels.panelTitle}</p>
              <span>{labels.panelDescription}</span>
            </div>
            <span className={styles.workflowStatus}>
              <span aria-hidden="true" />
              {labels.status}
            </span>
          </div>

          <div className={styles.workflowStepsStage}>
            <EnergyLine className={`${styles.workflowEnergyLine} ${styles.workflowEnergyLineHorizontal}`} />
            <EnergyLine className={`${styles.workflowEnergyLine} ${styles.workflowEnergyLineVertical}`} orientation="vertical" />
            <ol className={styles.workflowSteps}>
              {steps.map((step, index) => {
                const Icon = WORKFLOW_ICONS[index];
                const isLast = index === steps.length - 1;

                return (
                  <li className={styles.workflowStep} data-workflow-step key={step.index}>
                    <div className={styles.workflowStepMarker}>
                      <span>{step.index}</span>
                      <Icon aria-hidden="true" />
                    </div>
                    <div className={styles.workflowStepCopy}>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                    {!isLast ? <FiArrowRight aria-hidden="true" className={styles.workflowArrow} /> : null}
                  </li>
                );
              })}
            </ol>
          </div>

          <p className={styles.workflowOutcome}>
            <FiCheckCircle aria-hidden="true" />
            {labels.outcome}
          </p>
        </MangaPanel>
      </EditorialWorkflowMotion>
    </section>
  );
}
