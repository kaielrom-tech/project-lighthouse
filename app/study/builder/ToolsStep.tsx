"use client";

import styles from "../study.module.css";

type ToolsStepProps = {
  includeVocabulary: boolean;
  includeDefinitions: boolean;
  includeFlashcards: boolean;
  includeQuiz: boolean;
  vocabCount: 5 | 10 | 15;
  definitionCount: 5 | 10 | 15;
  flashcardCount: 5 | 10 | 20;
  quizCount: 5 | 10 | 15 | 20;
  quizMultipleChoice: boolean;
  quizTrueFalse: boolean;
  quizShortAnswer: boolean;
  onToggle: (
    key:
      | "includeVocabulary"
      | "includeDefinitions"
      | "includeFlashcards"
      | "includeQuiz",
    value: boolean
  ) => void;
  onCountChange: (
    key: "vocabCount" | "definitionCount" | "flashcardCount" | "quizCount",
    value: number
  ) => void;
  onQuizTypeChange: (
    key: "quizMultipleChoice" | "quizTrueFalse" | "quizShortAnswer",
    value: boolean
  ) => void;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
};

const TOOLS = [
  {
    key: "includeFlashcards" as const,
    countKey: "flashcardCount" as const,
    title: "Flashcards",
    description: "Test one important idea at a time.",
    options: [5, 10, 20] as const,
  },
  {
    key: "includeVocabulary" as const,
    countKey: "vocabCount" as const,
    title: "Vocabulary",
    description: "Important terms with clear definitions.",
    options: [5, 10, 15] as const,
  },
  {
    key: "includeDefinitions" as const,
    countKey: "definitionCount" as const,
    title: "Key Definitions",
    description: "Major concepts and why they matter.",
    options: [5, 10, 15] as const,
  },
  {
    key: "includeQuiz" as const,
    countKey: "quizCount" as const,
    title: "Quiz",
    description:
      "Practice with multiple-choice, true-or-false, and short-answer questions.",
    options: [5, 10, 15, 20] as const,
  },
];

export default function ToolsStep({
  includeVocabulary,
  includeDefinitions,
  includeFlashcards,
  includeQuiz,
  vocabCount,
  definitionCount,
  flashcardCount,
  quizCount,
  quizMultipleChoice,
  quizTrueFalse,
  quizShortAnswer,
  onToggle,
  onCountChange,
  onQuizTypeChange,
  onBack,
  onContinue,
  onCancel,
}: ToolsStepProps) {
  const selected = {
    includeVocabulary,
    includeDefinitions,
    includeFlashcards,
    includeQuiz,
  };
  const counts = {
    vocabCount,
    definitionCount,
    flashcardCount,
    quizCount,
  };
  const hasOne =
    includeVocabulary ||
    includeDefinitions ||
    includeFlashcards ||
    includeQuiz;
  const quizTypesOk =
    !includeQuiz || quizMultipleChoice || quizTrueFalse || quizShortAnswer;
  const canContinue = hasOne && quizTypesOk;

  return (
    <section className={styles.builderStep}>
      <h1 className={styles.pageTitle}>What should we create?</h1>
      <p className={styles.pageLead}>Choose at least one study tool.</p>

      <div className={styles.toolRows}>
        {TOOLS.map((tool) => {
          const isOn = selected[tool.key];
          const count = counts[tool.countKey];
          return (
            <div
              key={tool.key}
              className={`${styles.toolRow} ${isOn ? styles.toolRowOn : ""}`}
            >
              <button
                type="button"
                className={styles.toolRowToggle}
                aria-pressed={isOn}
                onClick={() => onToggle(tool.key, !isOn)}
              >
                <span className={styles.toolRowCheck} aria-hidden="true">
                  {isOn ? "✓" : ""}
                </span>
                <span>
                  <span className={styles.toolRowTitle}>{tool.title}</span>
                  <span className={styles.toolRowText}>
                    {tool.description}
                    {tool.key === "includeQuiz" ? (
                      <>
                        {" "}
                        If you pick only one type, every question will use that
                        form.
                      </>
                    ) : null}
                  </span>
                </span>
              </button>
              {isOn && (
                <div
                  className={styles.quantityRow}
                  role="group"
                  aria-label={`${tool.title} count`}
                >
                  {tool.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`${styles.quantityChip} ${
                        count === option ? styles.quantityChipOn : ""
                      }`}
                      onClick={() => onCountChange(tool.countKey, option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
              {isOn && tool.key === "includeQuiz" && (
                <div
                  className={styles.quantityRow}
                  role="group"
                  aria-label="Quiz question types"
                >
                  {(
                    [
                      {
                        key: "quizMultipleChoice" as const,
                        label: "Multiple Choice",
                        on: quizMultipleChoice,
                      },
                      {
                        key: "quizTrueFalse" as const,
                        label: "True or False",
                        on: quizTrueFalse,
                      },
                      {
                        key: "quizShortAnswer" as const,
                        label: "Short Answer",
                        on: quizShortAnswer,
                      },
                    ] as const
                  ).map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      className={`${styles.quantityChip} ${
                        type.on ? styles.quantityChipOn : ""
                      }`}
                      aria-pressed={type.on}
                      onClick={() => onQuizTypeChange(type.key, !type.on)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {includeQuiz && !quizTypesOk && (
        <p className={styles.errorText} role="alert">
          Choose at least one quiz question type.
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
            disabled={!canContinue}
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}
