import Link from "next/link";
import { FiArrowUpRight, FiCheck, FiCompass, FiCreditCard, FiHome, FiZap } from "react-icons/fi";

import { EnergyLine } from "@/components/brand/energy-line";
import { MangaPanel } from "@/components/brand/manga-panel";
import { SoliaScene } from "@/components/brand/solia-scenes";

import styles from "./solar-editorial-home.module.css";

type SoliaMomentNode = Readonly<{
  label: string;
  icon: "bill" | "home" | "habit" | "budget" | "system";
}>;

export type EditorialSoliaMomentLabels = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  callout: string;
  cta: string;
  alt: string;
  nodeLabel: string;
  nodes: readonly SoliaMomentNode[];
}>;

type EditorialSoliaMomentProps = Readonly<{
  href: string;
  labels: EditorialSoliaMomentLabels;
}>;

const NODE_ICONS = {
  bill: FiCreditCard,
  home: FiHome,
  habit: FiCompass,
  budget: FiCheck,
  system: FiZap,
} as const;

export default function EditorialSoliaMoment({ href, labels }: EditorialSoliaMomentProps) {
  return (
    <section className={styles.soliaMoment} id="solia-guide" aria-labelledby="solia-moment-title">
      <div className={styles.soliaMomentCopy}>
        <p className={styles.sectionMarker}>{labels.eyebrow}</p>
        <h2 id="solia-moment-title">{labels.title}</h2>
        <p>{labels.description}</p>
        <Link className={styles.soliaMomentAction} href={href}>
          {labels.cta}
          <FiArrowUpRight aria-hidden="true" />
        </Link>
      </div>

      <MangaPanel tone="dark" className={styles.soliaMomentStage}>
        <p className={styles.soliaMomentNodeLabel}>{labels.nodeLabel}</p>
        <EnergyLine className={styles.soliaMomentEnergy} orientation="horizontal" />
        <div className={styles.soliaMomentNodes} role="group" aria-label={labels.nodeLabel}>
          {labels.nodes.map((node, index) => {
            const Icon = NODE_ICONS[node.icon];
            return (
              <span
                className={`${styles.soliaMomentNode} ${index % 2 === 0 ? styles.soliaMomentNodeTop : styles.soliaMomentNodeBottom}`}
                data-solia-node
                key={`${node.icon}-${node.label}`}
              >
                <Icon aria-hidden="true" />
                {node.label}
              </span>
            );
          })}
        </div>
        <SoliaScene
          className={styles.soliaMomentMascot}
          imageClassName={styles.soliaMomentMascotImage}
          imageSizes="(max-width: 720px) 62vw, 300px"
          entranceAnimation="reveal"
          layer="foreground"
          pose="blueprint"
          position="center"
          size="standard"
          state="guiding"
          alt={labels.alt}
          speechBubble={labels.callout}
          speechBubbleClassName={styles.soliaMomentCallout}
          speechBubbleTail="right"
        />
        <span className={styles.soliaMomentStatus}>
          <span aria-hidden="true" />
          {labels.eyebrow}
        </span>
      </MangaPanel>
    </section>
  );
}
