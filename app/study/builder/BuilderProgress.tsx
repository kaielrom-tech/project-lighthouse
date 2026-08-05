"use client";

import type { BuilderStep } from "./types";
import styles from "../study.module.css";

const STEPS: { id: BuilderStep; label: string }[] = [
  { id: 1, label: "Material" },
  { id: 2, label: "Tools" },
  { id: 3, label: "Settings" },
  { id: 4, label: "Review" },
];

type BuilderProgressProps = {
  current: BuilderStep;
  highestReached: BuilderStep;
  onJump: (step: BuilderStep) => void;
};

export default function BuilderProgress({
  current,
  highestReached,
  onJump,
}: BuilderProgressProps) {
  return (
    <nav className={styles.builderProgress} aria-label="Creation steps">
      {STEPS.map((step) => {
        const isCurrent = step.id === current;
        const isComplete = step.id < current;
        const canJump = step.id <= highestReached;
        return (
          <button
            key={step.id}
            type="button"
            className={`${styles.builderProgressStep} ${
              isCurrent ? styles.builderProgressCurrent : ""
            } ${isComplete ? styles.builderProgressComplete : ""}`}
            disabled={!canJump}
            aria-current={isCurrent ? "step" : undefined}
            onClick={() => {
              if (canJump) onJump(step.id);
            }}
          >
            <span className={styles.builderProgressIndex} aria-hidden="true">
              {isComplete ? "✓" : step.id}
            </span>
            <span className={styles.builderProgressLabel}>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
