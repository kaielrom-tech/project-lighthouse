"use client";

import type { ReactNode } from "react";
import {
  GRADE_LABELS,
  STYLE_LABELS,
  SUBJECT_LABELS,
} from "../labels";
import type {
  ExplanationStyle,
  Grade,
  LearningCardOption,
  SourceType,
  Subject,
} from "../types";
import type { BuilderDraft, BuilderStep } from "./types";
import styles from "../study.module.css";

const SOURCE_LABELS: Record<SourceType, string> = {
  topic: "Topic",
  notes: "Notes",
  "learning-card": "AI Explanation",
  file: "PDF or Image",
};

type ReviewStepProps = {
  draft: BuilderDraft;
  file: File | null;
  learningCards: LearningCardOption[];
  error: string | null;
  onEdit: (step: BuilderStep) => void;
  onBack: () => void;
  onCancel: () => void;
  onGenerate: () => void;
};

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.reviewSection}>
      <div className={styles.reviewSectionHeader}>
        <h2 className={styles.subheading}>{title}</h2>
        <button type="button" className={styles.textButton} onClick={onEdit}>
          Edit
        </button>
      </div>
      <div className={styles.reviewBody}>{children}</div>
    </section>
  );
}

export default function ReviewStep({
  draft,
  file,
  learningCards,
  error,
  onEdit,
  onBack,
  onCancel,
  onGenerate,
}: ReviewStepProps) {
  const card = learningCards.find((item) => item.id === draft.selectedCardId);
  const sourceDetail =
    draft.sourceType === "topic"
      ? draft.topic
      : draft.sourceType === "notes"
        ? draft.notes.trim().slice(0, 180) +
          (draft.notes.trim().length > 180 ? "…" : "")
        : draft.sourceType === "learning-card"
          ? card?.title ?? "Selected learning conversation"
          : file?.name ?? "Uploaded file";

  return (
    <section className={styles.builderStep}>
      <h1 className={styles.pageTitle}>Review</h1>
      <p className={styles.pageLead}>
        Confirm the details, then create your study set.
      </p>

      <Section title="Material" onEdit={() => onEdit(1)}>
        <p>
          {draft.sourceType ? SOURCE_LABELS[draft.sourceType] : "—"}
          {sourceDetail ? ` · ${sourceDetail}` : ""}
        </p>
      </Section>

      <Section title="Tools" onEdit={() => onEdit(2)}>
        <ul className={styles.reviewList}>
          {draft.includeFlashcards && (
            <li>{draft.flashcardCount} flashcards</li>
          )}
          {draft.includeVocabulary && (
            <li>{draft.vocabCount} vocabulary terms</li>
          )}
          {draft.includeDefinitions && (
            <li>{draft.definitionCount} key definitions</li>
          )}
          {draft.includeQuiz && (
            <li>
              {draft.quizCount} quiz questions (
              {[
                draft.quizMultipleChoice ? "multiple choice" : null,
                draft.quizTrueFalse ? "true/false" : null,
                draft.quizShortAnswer ? "short answer" : null,
              ]
                .filter(Boolean)
                .join(", ")}
              )
            </li>
          )}
        </ul>
      </Section>

      <Section title="Settings" onEdit={() => onEdit(3)}>
        <p>{draft.title || "—"}</p>
        <p>
          {SUBJECT_LABELS[draft.subject as Subject]} ·{" "}
          {GRADE_LABELS[draft.grade as Grade]} ·{" "}
          {STYLE_LABELS[draft.explanationStyle as ExplanationStyle]}
        </p>
      </Section>

      {error && (
        <p className={styles.errorText} role="alert">
          {error}
        </p>
      )}

      <div className={styles.stepActions}>
        <button type="button" className={styles.textButton} onClick={onCancel}>
          Cancel
        </button>
        <div className={styles.stepActionsRight}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onBack}
          >
            Back
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onGenerate}
          >
            Create Study Set
          </button>
        </div>
      </div>
    </section>
  );
}
