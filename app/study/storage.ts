import type {
  QuizAnswerResult,
  QuizAttempt,
  QuizDifficulty,
  QuizQuestion,
  QuizQuestionType,
  StudySet,
  TopicScore,
} from "./types";
import { createStudyId, MAX_QUIZ_ATTEMPTS_PER_SET } from "./types";

export const STUDY_STORAGE_KEY = "project-lighthouse.study-sets.v1";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function sanitizeQuizQuestion(value: unknown): QuizQuestion | null {
  if (!isObject(value)) return null;
  const type = value.type;
  if (
    type !== "multiple-choice" &&
    type !== "true-false" &&
    type !== "short-answer"
  ) {
    return null;
  }
  if (typeof value.question !== "string" || !value.question.trim()) return null;
  if (typeof value.correctAnswer !== "string" || !value.correctAnswer.trim()) {
    return null;
  }
  const difficulty: QuizDifficulty =
    value.difficulty === "easy" ||
    value.difficulty === "medium" ||
    value.difficulty === "hard"
      ? value.difficulty
      : "medium";

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id
        : createStudyId("quiz"),
    type: type as QuizQuestionType,
    question: value.question.slice(0, 500),
    choices: Array.isArray(value.choices)
      ? value.choices
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.slice(0, 200))
      : undefined,
    correctAnswer: value.correctAnswer.slice(0, 400),
    acceptedAnswers: Array.isArray(value.acceptedAnswers)
      ? value.acceptedAnswers
          .filter((c): c is string => typeof c === "string")
          .map((c) => c.slice(0, 200))
      : undefined,
    explanation:
      typeof value.explanation === "string"
        ? value.explanation.slice(0, 600)
        : "",
    topic:
      typeof value.topic === "string" && value.topic.trim()
        ? value.topic.slice(0, 80)
        : "General",
    difficulty,
  };
}

function sanitizeAttempt(value: unknown, studySetId: string): QuizAttempt | null {
  if (!isObject(value)) return null;
  if (!Array.isArray(value.questionIds) || !Array.isArray(value.answers)) {
    return null;
  }

  const answers: QuizAnswerResult[] = value.answers
    .map((item) => {
      if (!isObject(item)) return null;
      if (typeof item.questionId !== "string") return null;
      const outcome =
        item.outcome === "correct" ||
        item.outcome === "incorrect" ||
        item.outcome === "review"
          ? item.outcome
          : item.isCorrect
            ? "correct"
            : "incorrect";
      return {
        questionId: item.questionId,
        userAnswer:
          typeof item.userAnswer === "string" ? item.userAnswer.slice(0, 400) : "",
        outcome,
        isCorrect: Boolean(item.isCorrect) || outcome === "correct",
        earnedPoints:
          typeof item.earnedPoints === "number" ? item.earnedPoints : 0,
        possiblePoints:
          typeof item.possiblePoints === "number" ? item.possiblePoints : 1,
      } satisfies QuizAnswerResult;
    })
    .filter((item): item is QuizAnswerResult => Boolean(item));

  const topicScores: TopicScore[] = Array.isArray(value.topicScores)
    ? value.topicScores
        .map((item) => {
          if (!isObject(item) || typeof item.topic !== "string") return null;
          const correct = typeof item.correct === "number" ? item.correct : 0;
          const attempted =
            typeof item.attempted === "number" ? item.attempted : 0;
          return {
            topic: item.topic.slice(0, 80),
            correct,
            attempted,
            percentage:
              typeof item.percentage === "number"
                ? item.percentage
                : attempted > 0
                  ? Math.round((correct / attempted) * 100)
                  : 0,
          } satisfies TopicScore;
        })
        .filter((item): item is TopicScore => Boolean(item))
    : [];

  return {
    id:
      typeof value.id === "string" && value.id
        ? value.id
        : createStudyId("attempt"),
    studySetId:
      typeof value.studySetId === "string" ? value.studySetId : studySetId,
    mode: value.mode === "missed" ? "missed" : "full",
    startedAt:
      typeof value.startedAt === "string"
        ? value.startedAt
        : new Date().toISOString(),
    completedAt:
      typeof value.completedAt === "string"
        ? value.completedAt
        : new Date().toISOString(),
    questionIds: value.questionIds.filter(
      (id): id is string => typeof id === "string"
    ),
    answers,
    score: typeof value.score === "number" ? value.score : 0,
    totalPossible:
      typeof value.totalPossible === "number" ? value.totalPossible : 0,
    percentage: typeof value.percentage === "number" ? value.percentage : 0,
    topicScores,
  };
}

function sanitizeStudySet(value: unknown): StudySet | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== "string" || typeof value.title !== "string") {
    return null;
  }
  if (typeof value.sourceText !== "string") return null;
  if (!Array.isArray(value.vocabulary)) return null;
  if (!Array.isArray(value.keyDefinitions)) return null;
  if (!Array.isArray(value.flashcards)) return null;

  const quizQuestions = Array.isArray(value.quizQuestions)
    ? value.quizQuestions
        .map((item) => sanitizeQuizQuestion(item))
        .filter((item): item is QuizQuestion => Boolean(item))
    : [];

  const quizAttempts = Array.isArray(value.quizAttempts)
    ? value.quizAttempts
        .map((item) => sanitizeAttempt(item, value.id as string))
        .filter((item): item is QuizAttempt => Boolean(item))
        .slice(-MAX_QUIZ_ATTEMPTS_PER_SET)
    : [];

  return {
    id: value.id,
    title: value.title.slice(0, 160),
    subject: (value.subject as StudySet["subject"]) || "general",
    grade: (value.grade as StudySet["grade"]) || "8",
    explanationStyle:
      (value.explanationStyle as StudySet["explanationStyle"]) || "normal",
    sourceType: (value.sourceType as StudySet["sourceType"]) || "topic",
    sourceLabel:
      typeof value.sourceLabel === "string"
        ? value.sourceLabel.slice(0, 200)
        : "Saved study set",
    sourceText: value.sourceText.slice(0, 12000),
    vocabulary: value.vocabulary as StudySet["vocabulary"],
    keyDefinitions: value.keyDefinitions as StudySet["keyDefinitions"],
    flashcards: value.flashcards as StudySet["flashcards"],
    quizQuestions,
    quizAttempts,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof value.updatedAt === "string" ? value.updatedAt : undefined,
    reviewStats: isObject(value.reviewStats)
      ? (value.reviewStats as StudySet["reviewStats"])
      : undefined,
  };
}

export function loadStudySets(): StudySet[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STUDY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => sanitizeStudySet(item))
      .filter((item): item is StudySet => Boolean(item));
  } catch {
    return [];
  }
}

export function saveStudySets(sets: StudySet[]): void {
  if (typeof window === "undefined") return;

  try {
    const limited = sets.map((set) => ({
      ...set,
      quizAttempts: (set.quizAttempts ?? []).slice(-MAX_QUIZ_ATTEMPTS_PER_SET),
    }));
    window.localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(limited));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
