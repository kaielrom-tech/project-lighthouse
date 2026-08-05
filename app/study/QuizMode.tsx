"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { GRADE_LABELS, SUBJECT_LABELS } from "./labels";
import {
  appendQuizAttempt,
  convertQuizQuestionsToType,
  createQuizAttempt,
  difficultyLabel,
  filterQuizQuestions,
  findRelatedMaterials,
  getMissedQuestionIds,
  gradeAnswer,
  knowledgeLabel,
  normalizeShortAnswer,
  shuffleChoices,
  summarizeAnswers,
  topicStatusLabel,
  typeLabel,
} from "./quizHelpers";
import type {
  QuizAnswerResult,
  QuizAttempt,
  QuizDifficulty,
  QuizModeKind,
  QuizQuestion,
  QuizQuestionType,
  StudySet,
} from "./types";
import styles from "./study.module.css";

type QuizPhase = "setup" | "taking" | "results" | "review";

type QuizModeProps = {
  studySet: StudySet;
  onBack: () => void;
  onUpdate: (next: StudySet) => void;
  /** When set, open directly to that attempt's results. */
  initialAttemptId?: string | null;
};

const COUNT_OPTIONS = [5, 10, 15] as const;

export default function QuizMode({
  studySet,
  onBack,
  onUpdate,
  initialAttemptId = null,
}: QuizModeProps) {
  const questions = useMemo(
    () => studySet.quizQuestions ?? [],
    [studySet.quizQuestions]
  );
  const missedIds = useMemo(
    () => getMissedQuestionIds(studySet),
    [studySet]
  );

  const availableTypes = useMemo(() => {
    const set = new Set<QuizQuestionType>();
    for (const q of questions) set.add(q.type);
    return set;
  }, [questions]);

  const [phase, setPhase] = useState<QuizPhase>(() =>
    initialAttemptId ? "results" : "setup"
  );
  const [includeMc, setIncludeMc] = useState(() =>
    availableTypes.has("multiple-choice")
  );
  const [includeTf, setIncludeTf] = useState(() =>
    availableTypes.has("true-false")
  );
  const [includeSa, setIncludeSa] = useState(() =>
    availableTypes.has("short-answer")
  );
  const [difficulty, setDifficulty] = useState<QuizDifficulty | "all">("all");
  const [mode, setMode] = useState<QuizModeKind>("full");
  const [countOption, setCountOption] = useState<number | "all">(10);

  const [sessionQuestions, setSessionQuestions] = useState<QuizQuestion[]>(() => {
    if (!initialAttemptId) return [];
    const attempt = (studySet.quizAttempts ?? []).find(
      (a) => a.id === initialAttemptId
    );
    if (!attempt) return [];
    return attempt.questionIds
      .map((id) => studySet.quizQuestions.find((q) => q.id === id))
      .filter((q): q is QuizQuestion => Boolean(q));
  });
  const [displayChoices, setDisplayChoices] = useState<string[][]>([]);
  const [answers, setAnswers] = useState<QuizAnswerResult[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [currentResult, setCurrentResult] = useState<QuizAnswerResult | null>(
    null
  );
  const [startedAt, setStartedAt] = useState("");
  const [sessionMode, setSessionMode] = useState<QuizModeKind>("full");
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(
    () => {
      if (!initialAttemptId) return null;
      return (
        (studySet.quizAttempts ?? []).find((a) => a.id === initialAttemptId) ??
        null
      );
    }
  );
  const [previousAttemptForCompare, setPreviousAttemptForCompare] =
    useState<QuizAttempt | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const feedbackId = useId();

  const filteredPreviewCount = useMemo(() => {
    const types = new Set<QuizQuestionType>();
    if (includeMc) types.add("multiple-choice");
    if (includeTf) types.add("true-false");
    if (includeSa) types.add("short-answer");
    const singleForm = types.size === 1;
    return filterQuizQuestions(questions, {
      types,
      difficulty,
      mode,
      missedIds,
      limit: "all",
      includeAllTypes: singleForm,
    }).length;
  }, [
    questions,
    includeMc,
    includeTf,
    includeSa,
    difficulty,
    mode,
    missedIds,
  ]);

  const validCountOptions = useMemo(() => {
    const opts: Array<number | "all"> = [];
    for (const n of COUNT_OPTIONS) {
      if (n <= filteredPreviewCount) opts.push(n);
    }
    if (filteredPreviewCount > 0) opts.push("all");
    return opts;
  }, [filteredPreviewCount]);

  useEffect(() => {
    if (countOption !== "all" && !validCountOptions.includes(countOption)) {
      setCountOption(validCountOptions[0] ?? "all");
    }
  }, [validCountOptions, countOption]);

  function confirmExit(): boolean {
    if (phase === "taking" && !submitted && answers.length < sessionQuestions.length) {
      return window.confirm(
        "Leave this quiz? Your current progress will not be saved."
      );
    }
    if (phase === "taking" && answers.length > 0 && answers.length < sessionQuestions.length) {
      return window.confirm(
        "Leave this quiz? Your unfinished attempt will be discarded."
      );
    }
    return true;
  }

  function handleExitToStudySet() {
    if (!confirmExit()) return;
    onBack();
  }

  function startQuiz(override?: {
    mode?: QuizModeKind;
    questionIds?: string[];
  }) {
    const types = new Set<QuizQuestionType>();
    if (includeMc) types.add("multiple-choice");
    if (includeTf) types.add("true-false");
    if (includeSa) types.add("short-answer");
    if (types.size === 0) return;

    const singleForm =
      types.size === 1 ? Array.from(types)[0] : null;
    const nextMode = override?.mode ?? mode;
    let pool: QuizQuestion[];
    if (override?.questionIds) {
      const idSet = new Set(override.questionIds);
      pool = questions.filter((q) => idSet.has(q.id));
      pool = filterQuizQuestions(pool, {
        types: new Set(pool.map((q) => q.type)),
        difficulty: "all",
        mode: "full",
        missedIds: [],
        limit: "all",
        includeAllTypes: true,
      });
      if (singleForm) {
        pool = convertQuizQuestionsToType(pool, singleForm, questions);
      }
    } else {
      pool = filterQuizQuestions(questions, {
        types,
        difficulty,
        mode: nextMode,
        missedIds,
        limit: countOption,
        includeAllTypes: Boolean(singleForm),
      });
      if (singleForm) {
        pool = convertQuizQuestionsToType(pool, singleForm, questions);
      }
    }

    if (pool.length === 0) return;

    setSessionQuestions(pool);
    setDisplayChoices(
      pool.map((q) =>
        q.choices && q.choices.length > 0
          ? shuffleChoices(q.choices, q.correctAnswer)
          : []
      )
    );
    setAnswers([]);
    setIndex(0);
    setSelected("");
    setSubmitted(false);
    setCurrentResult(null);
    setStartedAt(new Date().toISOString());
    setSessionMode(nextMode);
    setCompletedAttempt(null);
    setPreviousAttemptForCompare(null);
    setPhase("taking");
  }

  function submitCurrent() {
    const question = sessionQuestions[index];
    if (!question || submitted) return;
    if (!selected.trim()) return;

    const result = gradeAnswer(question, selected);
    setCurrentResult(result);
    setSubmitted(true);
    setAnswers((prev) => [...prev, result]);
  }

  function finishQuiz(finalAnswers: QuizAnswerResult[]) {
    const merged =
      finalAnswers.length >= sessionQuestions.length
        ? finalAnswers.slice(0, sessionQuestions.length)
        : finalAnswers;

    const attempt = createQuizAttempt({
      studySetId: studySet.id,
      mode: sessionMode,
      questions: sessionQuestions,
      answers: merged,
      startedAt: startedAt || new Date().toISOString(),
    });

    const prior =
      (studySet.quizAttempts ?? []).length > 0
        ? studySet.quizAttempts![studySet.quizAttempts!.length - 1]
        : null;

    setPreviousAttemptForCompare(sessionMode === "missed" ? prior : null);
    setCompletedAttempt(attempt);
    onUpdate(appendQuizAttempt(studySet, attempt));
    setPhase("results");
  }

  function handleNextOrFinish() {
    if (!submitted || !currentResult) return;
    const nextAnswers = [...answers];
    if (index >= sessionQuestions.length - 1) {
      finishQuiz(nextAnswers);
      return;
    }
    setIndex((i) => i + 1);
    setSelected("");
    setSubmitted(false);
    setCurrentResult(null);
  }

  const missedFromAttempt = useMemo(() => {
    if (!completedAttempt) return [];
    return completedAttempt.answers
      .filter((a) => a.outcome === "incorrect" || a.outcome === "review")
      .map((a) => {
        const q = sessionQuestions.find((item) => item.id === a.questionId)
          ?? studySet.quizQuestions.find((item) => item.id === a.questionId);
        return q && a ? { question: q, answer: a } : null;
      })
      .filter(
        (
          item
        ): item is { question: QuizQuestion; answer: QuizAnswerResult } =>
          Boolean(item)
      );
  }, [completedAttempt, sessionQuestions, studySet.quizQuestions]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (phase !== "taking" || submitted) return;
      const question = sessionQuestions[index];
      if (!question) return;
      if (
        question.type === "short-answer" &&
        document.activeElement instanceof HTMLInputElement
      ) {
        if (event.key === "Enter") {
          event.preventDefault();
          submitCurrent();
        }
        return;
      }
      const choices =
        question.type === "true-false"
          ? ["True", "False"]
          : displayChoices[index] ?? question.choices ?? [];
      const num = Number(event.key);
      if (num >= 1 && num <= choices.length) {
        setSelected(choices[num - 1]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (questions.length === 0) {
    return (
      <div className={styles.workspace}>
        <button type="button" className={styles.textButton} onClick={onBack}>
          ← Back to Study Set
        </button>
        <h1 className={styles.pageTitle}>Quiz</h1>
        <p className={styles.pageLead}>
          This study set does not have quiz questions yet. Create a new study
          set with Quiz selected to generate questions.
        </p>
      </div>
    );
  }

  if (phase === "setup") {
    const canStart =
      filteredPreviewCount > 0 &&
      (includeMc || includeTf || includeSa) &&
      validCountOptions.length > 0;

    return (
      <div className={styles.workspace} ref={rootRef}>
        <button
          type="button"
          className={styles.textButton}
          onClick={onBack}
        >
          ← Back to Study Set
        </button>
        <p className={styles.quizMeta}>
          {studySet.title} · {SUBJECT_LABELS[studySet.subject]} ·{" "}
          {GRADE_LABELS[studySet.grade]} · {questions.length} questions
          available
        </p>
        <h1 className={styles.pageTitle}>Quiz yourself</h1>
        <p className={styles.pageLead}>Choose how you want to practice.</p>

        <section className={styles.quizSetupSection}>
          <h2 className={styles.quizSetupHeading}>Number of questions</h2>
          <div className={styles.quantityRow} role="group">
            {validCountOptions.map((opt) => (
              <button
                key={String(opt)}
                type="button"
                className={`${styles.quantityChip} ${
                  countOption === opt ? styles.quantityChipOn : ""
                }`}
                onClick={() => setCountOption(opt)}
              >
                {opt === "all" ? "All" : opt}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.quizSetupSection}>
          <h2 className={styles.quizSetupHeading}>Question types</h2>
          <p className={styles.mutedText}>
            Choose one type to practice every question in that form. Choose two
            or three to keep each question in its original form.
          </p>
          <div className={styles.quantityRow} role="group">
            <button
              type="button"
              className={`${styles.quantityChip} ${
                includeMc ? styles.quantityChipOn : ""
              }`}
              aria-pressed={includeMc}
              onClick={() => setIncludeMc((v) => !v)}
            >
              Multiple Choice
            </button>
            <button
              type="button"
              className={`${styles.quantityChip} ${
                includeTf ? styles.quantityChipOn : ""
              }`}
              aria-pressed={includeTf}
              onClick={() => setIncludeTf((v) => !v)}
            >
              True or False
            </button>
            <button
              type="button"
              className={`${styles.quantityChip} ${
                includeSa ? styles.quantityChipOn : ""
              }`}
              aria-pressed={includeSa}
              onClick={() => setIncludeSa((v) => !v)}
            >
              Short Answer
            </button>
          </div>
        </section>

        <section className={styles.quizSetupSection}>
          <h2 className={styles.quizSetupHeading}>Difficulty</h2>
          <div className={styles.quantityRow} role="group">
            {(["all", "easy", "medium", "hard"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${styles.quantityChip} ${
                  difficulty === opt ? styles.quantityChipOn : ""
                }`}
                onClick={() => setDifficulty(opt)}
              >
                {opt === "all" ? "All" : difficultyLabel(opt)}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.quizSetupSection}>
          <h2 className={styles.quizSetupHeading}>Mode</h2>
          <div className={styles.quizModeCards}>
            <button
              type="button"
              className={`${styles.quizModeCard} ${
                mode === "full" ? styles.quizModeCardOn : ""
              }`}
              aria-pressed={mode === "full"}
              onClick={() => setMode("full")}
            >
              <span className={styles.toolListTitle}>Full Quiz</span>
              <span className={styles.toolListText}>
                Use questions from across the study set.
              </span>
            </button>
            <button
              type="button"
              className={`${styles.quizModeCard} ${
                mode === "missed" ? styles.quizModeCardOn : ""
              }`}
              aria-pressed={mode === "missed"}
              disabled={missedIds.length === 0}
              onClick={() => setMode("missed")}
            >
              <span className={styles.toolListTitle}>Missed Questions</span>
              <span className={styles.toolListText}>
                Practice questions you previously answered incorrectly.
              </span>
            </button>
          </div>
        </section>

        <div className={styles.stepActions}>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canStart}
            onClick={() => startQuiz()}
          >
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (phase === "taking") {
    const question = sessionQuestions[index];
    const progressPct =
      ((answers.length + (submitted ? 0 : 0)) / sessionQuestions.length) * 100;
    const shownProgress =
      ((index + (submitted ? 1 : 0)) / sessionQuestions.length) * 100;
    void progressPct;

    const choices =
      question.type === "true-false"
        ? ["True", "False"]
        : displayChoices[index] ?? question.choices ?? [];

    return (
      <div className={styles.quizTaking} ref={rootRef}>
        <header className={styles.quizTopBar}>
          <button
            type="button"
            className={styles.textButton}
            onClick={handleExitToStudySet}
          >
            Exit Quiz
          </button>
          <span className={styles.quizTopTitle}>{studySet.title}</span>
          <span className={styles.quizTopCount}>
            {index + 1} of {sessionQuestions.length}
          </span>
        </header>

        <div
          className={styles.quizProgressTrack}
          role="progressbar"
          aria-valuenow={index + (submitted ? 1 : 0)}
          aria-valuemin={0}
          aria-valuemax={sessionQuestions.length}
          aria-label="Quiz progress"
        >
          <div
            className={styles.quizProgressFill}
            style={{ width: `${shownProgress}%` }}
          />
        </div>
        <p className={styles.quizProgressLabel}>
          {index + (submitted ? 1 : 0)} of {sessionQuestions.length} completed
        </p>

        <div className={styles.quizQuestionPanel}>
          <div className={styles.quizQuestionMeta}>
            <span className={styles.inlineLabel}>{typeLabel(question.type)}</span>
            <span className={styles.inlineLabel}>{question.topic}</span>
          </div>
          <h1 className={styles.quizQuestionText}>{question.question}</h1>

          {question.type === "short-answer" ? (
            <label className={styles.field}>
              <span className={styles.inlineLabel}>Your answer</span>
              <input
                className={styles.textInput}
                value={selected}
                disabled={submitted}
                onChange={(e) => setSelected(e.target.value)}
                aria-describedby={submitted ? feedbackId : undefined}
              />
            </label>
          ) : (
            <div
              className={styles.quizChoiceList}
              role="radiogroup"
              aria-label="Answer choices"
            >
              {choices.map((choice) => {
                const isSelected = selected === choice;
                let stateClass = "";
                let status = "";
                if (submitted && currentResult) {
                  const isCorrectChoice = answersMatchLocal(
                    choice,
                    question.correctAnswer
                  );
                  if (isCorrectChoice) {
                    stateClass = styles.quizChoiceCorrect;
                    status = "Correct answer";
                  }
                  if (isSelected && currentResult.outcome === "incorrect") {
                    stateClass = styles.quizChoiceIncorrect;
                    status = "Your answer";
                  }
                  if (isSelected && currentResult.outcome === "correct") {
                    stateClass = styles.quizChoiceCorrect;
                    status = "Correct · Your answer";
                  }
                } else if (isSelected) {
                  stateClass = styles.quizChoiceSelected;
                }

                return (
                  <button
                    key={choice}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`${styles.quizChoice} ${stateClass}`}
                    disabled={submitted}
                    onClick={() => setSelected(choice)}
                  >
                    <span>{choice}</span>
                    {status && (
                      <span className={styles.quizChoiceStatus}>{status}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {submitted && currentResult && (
            <div
              id={feedbackId}
              className={styles.quizFeedback}
              role="status"
              aria-live="polite"
            >
              <p className={styles.quizFeedbackOutcome}>
                {(() => {
                  if (currentResult.outcome === "incorrect") return "Incorrect";
                  if (currentResult.outcome === "review") return "Review";
                  if (
                    question.type === "short-answer" &&
                    normalizeShortAnswer(currentResult.userAnswer) !==
                      normalizeShortAnswer(question.correctAnswer)
                  ) {
                    return "That's true";
                  }
                  return "Correct";
                })()}
              </p>
              {question.type === "short-answer" && (
                <>
                  <p>
                    <span className={styles.inlineLabel}>Your answer</span>
                    {currentResult.userAnswer || "—"}
                  </p>
                  {currentResult.outcome === "correct" &&
                  normalizeShortAnswer(currentResult.userAnswer) !==
                    normalizeShortAnswer(question.correctAnswer) ? (
                    <p>
                      <span className={styles.inlineLabel}>
                        A fuller answer
                      </span>
                      {question.correctAnswer}
                    </p>
                  ) : (
                    <p>
                      <span className={styles.inlineLabel}>Expected answer</span>
                      {question.correctAnswer}
                    </p>
                  )}
                </>
              )}
              <p>
                <span className={styles.inlineLabel}>Explanation</span>
                {question.explanation}
              </p>
              <p>
                <span className={styles.inlineLabel}>Topic</span>
                {question.topic}
              </p>
            </div>
          )}

          <div className={styles.stepActions}>
            {!submitted ? (
              <button
                type="button"
                className={styles.primaryButton}
                disabled={!selected.trim()}
                onClick={submitCurrent}
              >
                Submit Answer
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleNextOrFinish}
              >
                {index >= sessionQuestions.length - 1
                  ? "See Results"
                  : "Next Question"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "review" && completedAttempt) {
    const item = missedFromAttempt[reviewIndex];
    if (!item) {
      return (
        <div className={styles.workspace}>
          <p className={styles.mutedText}>No missed questions to review.</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setPhase("results")}
          >
            Return to Results
          </button>
        </div>
      );
    }

    const related = findRelatedMaterials(item.question, studySet);

    return (
      <div className={styles.workspace}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => setPhase("results")}
        >
          ← Return to Results
        </button>
        <p className={styles.quizMeta}>
          Missed {reviewIndex + 1} of {missedFromAttempt.length}
        </p>
        <h1 className={styles.pageTitle}>Review incorrect answers</h1>

        <article className={styles.quizReviewCard}>
          <div className={styles.quizQuestionMeta}>
            <span className={styles.inlineLabel}>
              {typeLabel(item.question.type)}
            </span>
            <span className={styles.inlineLabel}>{item.question.topic}</span>
            <span className={styles.inlineLabel}>
              {difficultyLabel(item.question.difficulty)}
            </span>
          </div>
          <h2 className={styles.quizQuestionText}>{item.question.question}</h2>
          <p>
            <span className={styles.inlineLabel}>Your answer</span>
            {item.answer.userAnswer || "—"}
          </p>
          <p>
            <span className={styles.inlineLabel}>Correct answer</span>
            {item.question.correctAnswer}
          </p>
          <p>
            <span className={styles.inlineLabel}>Explanation</span>
            {item.question.explanation}
          </p>

          {(related.flashcards.length > 0 ||
            related.vocabulary.length > 0 ||
            related.definitions.length > 0) && (
            <div className={styles.quizRelated}>
              <h3 className={styles.quizSetupHeading}>Related study material</h3>
              {related.flashcards.map((card) => (
                <p key={card.id} className={styles.mutedText}>
                  Flashcard: {card.front}
                </p>
              ))}
              {related.vocabulary.map((term) => (
                <p key={term.id} className={styles.mutedText}>
                  Vocabulary: {term.term}
                </p>
              ))}
              {related.definitions.map((term) => (
                <p key={term.id} className={styles.mutedText}>
                  Key definition: {term.term}
                </p>
              ))}
            </div>
          )}
        </article>

        <div className={styles.stepActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={reviewIndex === 0}
            onClick={() => setReviewIndex((i) => i - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={reviewIndex >= missedFromAttempt.length - 1}
            onClick={() => setReviewIndex((i) => i + 1)}
          >
            Next
          </button>
        </div>
        <div className={styles.stepActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() =>
              startQuiz({
                mode: "missed",
                questionIds: [item.question.id],
              })
            }
          >
            Retry this question
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() =>
              startQuiz({
                mode: "missed",
                questionIds: missedFromAttempt.map((m) => m.question.id),
              })
            }
          >
            Retry all missed questions
          </button>
        </div>
      </div>
    );
  }

  // Results
  if (!completedAttempt) {
    return (
      <div className={styles.workspace}>
        <button type="button" className={styles.textButton} onClick={onBack}>
          ← Back to Study Set
        </button>
        <p className={styles.mutedText}>No results to show.</p>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setPhase("setup")}
        >
          Quiz yourself
        </button>
      </div>
    );
  }

  const attempt = completedAttempt;

  const summary = summarizeAnswers(attempt.answers);
  const improvement =
    previousAttemptForCompare != null
      ? attempt.percentage - previousAttemptForCompare.percentage
      : null;

  return (
    <div className={styles.workspace}>
      <button
        type="button"
        className={styles.textButton}
        onClick={onBack}
      >
        ← Return to Study Set
      </button>
      <h1 className={styles.pageTitle}>Quiz results</h1>
      <p className={styles.pageLead}>{knowledgeLabel(attempt.percentage)}</p>

      <div className={styles.quizScoreBlock}>
        <p className={styles.quizScoreBig}>
          {attempt.score} / {attempt.totalPossible}
        </p>
        <p className={styles.quizScorePct}>{attempt.percentage}%</p>
        <p className={styles.mutedText}>
          {summary.correct} correct · {summary.incorrect} incorrect
          {summary.review > 0 ? ` · ${summary.review} review` : ""}
          {summary.review > 0
            ? " (Review answers are excluded from the percentage.)"
            : ""}
        </p>
        {improvement != null && (
          <p className={styles.successBanner} role="status">
            {improvement > 0
              ? `Improved by ${improvement} points from your previous attempt.`
              : improvement < 0
                ? `${Math.abs(improvement)} points lower than your previous attempt.`
                : "Same score as your previous attempt."}
          </p>
        )}
      </div>

      {attempt.topicScores.length > 0 && (
        <section className={styles.quizSetupSection}>
          <h2 className={styles.quizSetupHeading}>Topic performance</h2>
          <ul className={styles.quizTopicList}>
            {attempt.topicScores.map((topic) => (
              <li key={topic.topic} className={styles.quizTopicRow}>
                <div className={styles.quizTopicHead}>
                  <span>{topic.topic}</span>
                  <span>
                    {topic.correct}/{topic.attempted} · {topic.percentage}% ·{" "}
                    {topicStatusLabel(topic.percentage, topic.attempted)}
                  </span>
                </div>
                <div className={styles.quizProgressTrack}>
                  <div
                    className={styles.quizProgressFill}
                    style={{ width: `${topic.percentage}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.quizResultActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={missedFromAttempt.length === 0}
          onClick={() => {
            setReviewIndex(0);
            setPhase("review");
          }}
        >
          Review Incorrect Answers
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          disabled={missedFromAttempt.length === 0}
          onClick={() =>
            startQuiz({
              mode: "missed",
              questionIds: missedFromAttempt.map((m) => m.question.id),
            })
          }
        >
          Retry Missed Questions
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => setPhase("setup")}
        >
          Retake Quiz
        </button>
      </div>
    </div>
  );
}

function answersMatchLocal(a: string, b: string): boolean {
  return (
    a.trim().toLowerCase().replace(/[.!?]+$/g, "") ===
    b.trim().toLowerCase().replace(/[.!?]+$/g, "")
  );
}
