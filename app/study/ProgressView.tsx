"use client";

import {
  aggregateTopicKnowledge,
  aggregateTypePerformance,
  estimateOverallKnowledge,
  knowledgeLabel,
  topicStatusLabel,
} from "./quizHelpers";
import type { StudySet } from "./types";
import styles from "./study.module.css";

type ProgressViewProps = {
  studySet: StudySet;
  onBack: () => void;
  onOpenAttempt: (attemptId: string) => void;
  onStartQuiz: () => void;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ProgressView({
  studySet,
  onBack,
  onOpenAttempt,
  onStartQuiz,
}: ProgressViewProps) {
  const attempts = [...(studySet.quizAttempts ?? [])].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt)
  );
  const knowledge = estimateOverallKnowledge(attempts);
  const topics = aggregateTopicKnowledge(studySet);
  const types = aggregateTypePerformance(studySet);
  const questionsAnswered = attempts.reduce(
    (sum, a) => sum + a.answers.length,
    0
  );

  return (
    <div className={styles.workspace}>
      <button type="button" className={styles.textButton} onClick={onBack}>
        ← Back to Study Set
      </button>
      <h1 className={styles.pageTitle}>Progress</h1>
      <p className={styles.pageLead}>
        Estimated knowledge based on quiz performance.
      </p>

      {attempts.length === 0 ? (
        <div className={styles.fullscreenState}>
          <p className={styles.mutedText}>
            Complete a quiz to see scores, topic strength, and recent attempts.
          </p>
          {(studySet.quizQuestions?.length ?? 0) > 0 && (
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onStartQuiz}
            >
              Start a Quiz
            </button>
          )}
        </div>
      ) : (
        <>
          <section className={styles.quizSetupSection}>
            <h2 className={styles.quizSetupHeading}>Overall knowledge</h2>
            <p className={styles.quizScoreBig}>{knowledge.estimated}%</p>
            <p className={styles.pageLead}>{knowledge.label}</p>
            <ul className={styles.reviewList}>
              <li>
                Latest score:{" "}
                {knowledge.latest != null ? `${knowledge.latest}%` : "—"}
              </li>
              <li>
                Best score: {knowledge.best != null ? `${knowledge.best}%` : "—"}
              </li>
              <li>
                Average score:{" "}
                {knowledge.average != null ? `${knowledge.average}%` : "—"}
              </li>
              <li>Total attempts: {attempts.length}</li>
              <li>Questions answered: {questionsAnswered}</li>
              <li>
                Current knowledge label:{" "}
                {knowledgeLabel(knowledge.estimated)}
              </li>
            </ul>
          </section>

          <section className={styles.quizSetupSection}>
            <h2 className={styles.quizSetupHeading}>Topic knowledge</h2>
            {topics.length === 0 ? (
              <p className={styles.mutedText}>Not enough practice yet</p>
            ) : (
              <ul className={styles.quizTopicList}>
                {topics.map((topic) => {
                  const status = topicStatusLabel(
                    topic.percentage,
                    topic.attempted
                  );
                  return (
                    <li key={topic.topic} className={styles.quizTopicRow}>
                      <div className={styles.quizTopicHead}>
                        <span>{topic.topic}</span>
                        <span>
                          {status === "Not enough practice yet"
                            ? status
                            : `${topic.correct}/${topic.attempted} · ${topic.percentage}% · ${status}`}
                        </span>
                      </div>
                      {status !== "Not enough practice yet" && (
                        <div className={styles.quizProgressTrack}>
                          <div
                            className={styles.quizProgressFill}
                            style={{ width: `${topic.percentage}%` }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={styles.quizSetupSection}>
            <h2 className={styles.quizSetupHeading}>
              Question-type performance
            </h2>
            <ul className={styles.quizTopicList}>
              {types.map((row) => (
                <li key={row.type} className={styles.quizTopicRow}>
                  <div className={styles.quizTopicHead}>
                    <span>{row.label}</span>
                    <span>
                      {row.attempted === 0
                        ? "Not enough practice yet"
                        : `${row.correct}/${row.attempted} · ${row.percentage}%`}
                    </span>
                  </div>
                  {row.attempted > 0 && (
                    <div className={styles.quizProgressTrack}>
                      <div
                        className={styles.quizProgressFill}
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.quizSetupSection}>
            <h2 className={styles.quizSetupHeading}>Recent attempts</h2>
            <ul className={styles.toolList}>
              {attempts.slice(0, 10).map((attempt) => (
                <li key={attempt.id}>
                  <button
                    type="button"
                    className={styles.toolListButton}
                    onClick={() => onOpenAttempt(attempt.id)}
                  >
                    <span className={styles.toolListCopy}>
                      <span className={styles.toolListTitle}>
                        {formatDate(attempt.completedAt)} · {attempt.percentage}
                        %
                      </span>
                      <span className={styles.toolListText}>
                        {attempt.mode === "missed"
                          ? "Missed questions"
                          : "Full quiz"}{" "}
                        · {attempt.questionIds.length} questions
                      </span>
                    </span>
                    <span className={styles.toolListArrow}>Open Results</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
