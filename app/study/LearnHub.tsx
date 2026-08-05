"use client";

import type { StudySet } from "./types";
import styles from "./study.module.css";

type LearnHubProps = {
  studySet: StudySet;
  onBack: () => void;
  onOpenVocabulary: () => void;
  onOpenDefinitions: () => void;
};

export default function LearnHub({
  studySet,
  onBack,
  onOpenVocabulary,
  onOpenDefinitions,
}: LearnHubProps) {
  return (
    <div className={styles.workspace}>
      <button type="button" className={styles.textButton} onClick={onBack}>
        ← Back to Study Set
      </button>
      <h1 className={styles.pageTitle}>Learn</h1>
      <p className={styles.pageLead}>
        Review important terms and understand the main ideas.
      </p>
      <ul className={styles.toolList}>
        {studySet.vocabulary.length > 0 && (
          <li>
            <button
              type="button"
              className={styles.toolListButton}
              onClick={onOpenVocabulary}
            >
              <span className={styles.toolListCopy}>
                <span className={styles.toolListTitle}>Vocabulary</span>
                <span className={styles.toolListText}>
                  {studySet.vocabulary.length} terms
                </span>
              </span>
              <span className={styles.toolListArrow} aria-hidden="true">
                →
              </span>
            </button>
          </li>
        )}
        {studySet.keyDefinitions.length > 0 && (
          <li>
            <button
              type="button"
              className={styles.toolListButton}
              onClick={onOpenDefinitions}
            >
              <span className={styles.toolListCopy}>
                <span className={styles.toolListTitle}>Key Definitions</span>
                <span className={styles.toolListText}>
                  {studySet.keyDefinitions.length} concepts
                </span>
              </span>
              <span className={styles.toolListArrow} aria-hidden="true">
                →
              </span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
