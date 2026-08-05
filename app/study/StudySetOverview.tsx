"use client";

import { useState } from "react";
import { SubjectIcon } from "../components/SubjectNav";
import {
  GRADE_LABELS,
  STYLE_LABELS,
  SUBJECT_LABELS,
} from "./labels";
import type { StudySet } from "./types";
import styles from "./study.module.css";

export type OverviewToolId =
  | "learn"
  | "flashcards"
  | "quiz"
  | "progress";

type StudySetOverviewProps = {
  studySet: StudySet;
  warning?: string | null;
  successMessage?: string | null;
  onBack: () => void;
  onOpenTool: (tool: OverviewToolId) => void;
  onUpdate: (next: StudySet) => void;
  onDelete: () => void;
};

export default function StudySetOverview({
  studySet,
  warning,
  successMessage,
  onBack,
  onOpenTool,
  onUpdate,
  onDelete,
}: StudySetOverviewProps) {
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(studySet.title);

  const learnCount =
    studySet.vocabulary.length + studySet.keyDefinitions.length;
  const attemptCount = studySet.quizAttempts?.length ?? 0;
  const quizCount = studySet.quizQuestions?.length ?? 0;

  const groups: {
    id: OverviewToolId;
    title: string;
    description: string;
    summary: string;
    available: boolean;
  }[] = [
    {
      id: "learn",
      title: "Learn",
      description: "Review important terms and understand the main ideas.",
      summary:
        learnCount > 0
          ? `${studySet.vocabulary.length} vocabulary · ${studySet.keyDefinitions.length} definitions`
          : "No learn materials yet",
      available:
        studySet.vocabulary.length > 0 || studySet.keyDefinitions.length > 0,
    },
    {
      id: "flashcards",
      title: "Flashcards",
      description: "Practice recalling important information one card at a time.",
      summary:
        studySet.flashcards.length > 0
          ? `${studySet.flashcards.length} cards`
          : "No flashcards yet",
      available: studySet.flashcards.length > 0,
    },
    {
      id: "quiz",
      title: "Quiz",
      description:
        "Test your knowledge with multiple choice, true or false, and short answer.",
      summary:
        quizCount > 0 ? `${quizCount} questions` : "No quiz questions yet",
      available: quizCount > 0,
    },
    {
      id: "progress",
      title: "Progress",
      description:
        "See your scores, strong topics, weak topics, and questions to review.",
      summary:
        attemptCount > 0
          ? `${attemptCount} attempt${attemptCount === 1 ? "" : "s"}`
          : quizCount > 0
            ? "No attempts yet"
            : "Complete a quiz to track progress",
      available: quizCount > 0 || attemptCount > 0,
    },
  ];

  const visible = groups.filter((g) => g.available);

  return (
    <div className={styles.workspace}>
      <div
        className={styles.subjectAccentBar}
        data-subject={studySet.subject}
        aria-hidden="true"
      />

      <button type="button" className={styles.textButton} onClick={onBack}>
        ← Back
      </button>

      <div className={styles.overviewTitleRow}>
        <SubjectIcon subject={studySet.subject} />
        {renaming ? (
          <div className={styles.renameInline}>
            <input
              className={styles.textInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Study set title"
            />
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                const next = title.trim();
                if (!next) return;
                onUpdate({
                  ...studySet,
                  title: next,
                  updatedAt: new Date().toISOString(),
                });
                setRenaming(false);
              }}
            >
              Save
            </button>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => {
                setTitle(studySet.title);
                setRenaming(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <h1 className={styles.pageTitle}>{studySet.title}</h1>
        )}
      </div>

      <p className={styles.pageLead}>
        {SUBJECT_LABELS[studySet.subject]} · {GRADE_LABELS[studySet.grade]} ·{" "}
        {STYLE_LABELS[studySet.explanationStyle]}
      </p>

      {!renaming && (
        <div className={styles.inlineActions}>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setRenaming(true)}
          >
            Rename
          </button>
          <button
            type="button"
            className={styles.textButton}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      )}

      {successMessage && (
        <p className={styles.successBanner} role="status">
          {successMessage}
        </p>
      )}

      {warning && (
        <p className={styles.warningBanner} role="status">
          {warning}
        </p>
      )}

      <section className={styles.toolListSection}>
        {visible.length === 0 ? (
          <p className={styles.mutedText}>
            This study set does not have any tools yet.
          </p>
        ) : (
          <ul className={styles.toolList}>
            {visible.map((tool) => (
              <li key={tool.id}>
                <button
                  type="button"
                  className={styles.toolListButton}
                  onClick={() => onOpenTool(tool.id)}
                >
                  <span className={styles.toolListCopy}>
                    <span className={styles.toolListTitle}>{tool.title}</span>
                    <span className={styles.toolListText}>
                      {tool.description}
                    </span>
                    <span className={styles.toolListSummary}>{tool.summary}</span>
                  </span>
                  <span className={styles.toolListArrow} aria-hidden="true">
                    Open →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
