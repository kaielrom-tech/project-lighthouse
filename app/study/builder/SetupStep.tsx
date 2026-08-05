"use client";

import SubjectNav from "../../components/SubjectNav";
import { EXPLANATION_STYLES, GRADES } from "../labels";
import type { ExplanationStyle, Grade, Subject } from "../types";
import styles from "../study.module.css";

type SetupStepProps = {
  title: string;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
  onTitleChange: (value: string) => void;
  onSubjectChange: (value: Subject) => void;
  onGradeChange: (value: Grade) => void;
  onStyleChange: (value: ExplanationStyle) => void;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
};

export default function SetupStep({
  title,
  subject,
  grade,
  explanationStyle,
  onTitleChange,
  onSubjectChange,
  onGradeChange,
  onStyleChange,
  onBack,
  onContinue,
  onCancel,
}: SetupStepProps) {
  return (
    <section className={styles.builderStep}>
      <h1 className={styles.pageTitle}>Settings</h1>
      <p className={styles.pageLead}>
        Give the set a title and match it to your class.
      </p>

      <div className={styles.settingsForm}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Title</span>
          <input
            className={styles.textInput}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Study set title"
          />
        </label>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Subject</span>
          <SubjectNav
            value={subject}
            includeAll={false}
            onChange={(value) => {
              if (value !== "all") onSubjectChange(value);
            }}
            ariaLabel="Study set subject"
          />
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Grade</span>
          <select
            className={styles.selectInput}
            value={grade}
            onChange={(e) => onGradeChange(e.target.value as Grade)}
          >
            {GRADES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Explanation</span>
          <select
            className={styles.selectInput}
            value={explanationStyle}
            onChange={(e) =>
              onStyleChange(e.target.value as ExplanationStyle)
            }
          >
            {EXPLANATION_STYLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
            disabled={!title.trim()}
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}
