import type {
  Flashcard,
  QuizAnswerResult,
  QuizAttempt,
  QuizDifficulty,
  QuizModeKind,
  QuizQuestion,
  QuizQuestionType,
  StudySet,
  StudyTerm,
  TopicScore,
} from "./types";
import { createStudyId, MAX_QUIZ_ATTEMPTS_PER_SET } from "./types";

/** Grading rules:
 * - Correct: 1 point (exact match, accepted alternative, or a clear key-word match)
 * - Incorrect: 0 points
 * - Review (close short-answer without a clear key word): 0 points and excluded
 *   from the strict percentage denominator
 */

export type GradeOutcome = "correct" | "incorrect" | "review";

const SHORT_ANSWER_STOP_WORDS = new Set([
  "the",
  "and",
  "or",
  "a",
  "an",
  "of",
  "to",
  "in",
  "is",
  "for",
  "that",
  "with",
  "on",
  "at",
  "by",
  "from",
  "as",
  "it",
  "be",
  "are",
  "was",
  "were",
  "this",
  "these",
  "those",
]);

export function normalizeShortAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

function answersMatch(user: string, expected: string): boolean {
  return normalizeShortAnswer(user) === normalizeShortAnswer(expected);
}

function significantTokens(value: string): string[] {
  return normalizeShortAnswer(value)
    .split(" ")
    .filter((token) => token.length >= 4 && !SHORT_ANSWER_STOP_WORDS.has(token));
}

/**
 * True when the student typed a meaningful key word from the expected answer
 * (or the expected answer contains their short key-word reply).
 */
export function hasKeyWordMatch(user: string, expected: string): boolean {
  const a = normalizeShortAnswer(user);
  const b = normalizeShortAnswer(expected);
  if (!a || !b || a === b) return false;

  const expectedKeys = significantTokens(b);
  const userKeys = significantTokens(a);

  if (expectedKeys.some((key) => a === key || a.includes(key))) return true;
  if (userKeys.some((key) => b.includes(key))) return true;

  // Whole short reply is a key substring of the fuller answer
  if (a.length >= 4 && !a.includes(" ") && b.includes(a)) return true;

  return false;
}

/** True when answers share most tokens but are not exact — mark as Review. */
function isCloseShortAnswer(user: string, expected: string): boolean {
  const a = normalizeShortAnswer(user);
  const b = normalizeShortAnswer(expected);
  if (!a || !b || a === b) return false;
  if (a.includes(b) || b.includes(a)) {
    const shorter = a.length <= b.length ? a : b;
    const longer = a.length > b.length ? a : b;
    if (shorter.length >= 3 && longer.length - shorter.length <= 8) return true;
  }
  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return false;
  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap += 1;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return overlap / union >= 0.6 && overlap >= 1;
}

export function gradeAnswer(
  question: QuizQuestion,
  userAnswer: string
): QuizAnswerResult {
  const trimmed = userAnswer.trim();

  if (question.type === "multiple-choice" || question.type === "true-false") {
    const isCorrect = answersMatch(trimmed, question.correctAnswer);
    return {
      questionId: question.id,
      userAnswer: trimmed,
      outcome: isCorrect ? "correct" : "incorrect",
      isCorrect,
      earnedPoints: isCorrect ? 1 : 0,
      possiblePoints: 1,
    };
  }

  // Short answer
  const accepted = [
    question.correctAnswer,
    ...(question.acceptedAnswers ?? []),
  ];
  if (accepted.some((ans) => answersMatch(trimmed, ans))) {
    return {
      questionId: question.id,
      userAnswer: trimmed,
      outcome: "correct",
      isCorrect: true,
      earnedPoints: 1,
      possiblePoints: 1,
    };
  }

  // Key word from the expected answer: count as correct, UI can add the fuller answer.
  if (accepted.some((ans) => hasKeyWordMatch(trimmed, ans))) {
    return {
      questionId: question.id,
      userAnswer: trimmed,
      outcome: "correct",
      isCorrect: true,
      earnedPoints: 1,
      possiblePoints: 1,
    };
  }

  if (accepted.some((ans) => isCloseShortAnswer(trimmed, ans))) {
    return {
      questionId: question.id,
      userAnswer: trimmed,
      outcome: "review",
      isCorrect: false,
      earnedPoints: 0,
      possiblePoints: 0,
    };
  }

  return {
    questionId: question.id,
    userAnswer: trimmed,
    outcome: "incorrect",
    isCorrect: false,
    earnedPoints: 0,
    possiblePoints: 1,
  };
}

export function shuffleArray<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function shuffleChoices(
  choices: string[],
  correctAnswer: string
): string[] {
  return shuffleArray(choices);
  // correctAnswer unchanged in the question object; display only shuffles.
  void correctAnswer;
}

export function buildTopicScores(
  questions: QuizQuestion[],
  answers: QuizAnswerResult[]
): TopicScore[] {
  const byTopic = new Map<string, { correct: number; attempted: number }>();
  const answerMap = new Map(answers.map((a) => [a.questionId, a]));

  for (const q of questions) {
    const result = answerMap.get(q.id);
    if (!result || result.outcome === "review") continue;
    const entry = byTopic.get(q.topic) ?? { correct: 0, attempted: 0 };
    entry.attempted += 1;
    if (result.outcome === "correct") entry.correct += 1;
    byTopic.set(q.topic, entry);
  }

  return Array.from(byTopic.entries())
    .map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      attempted: stats.attempted,
      percentage:
        stats.attempted > 0
          ? Math.round((stats.correct / stats.attempted) * 100)
          : 0,
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

export function summarizeAnswers(answers: QuizAnswerResult[]) {
  const correct = answers.filter((a) => a.outcome === "correct").length;
  const incorrect = answers.filter((a) => a.outcome === "incorrect").length;
  const review = answers.filter((a) => a.outcome === "review").length;
  const score = answers.reduce((sum, a) => sum + a.earnedPoints, 0);
  const totalPossible = answers.reduce((sum, a) => sum + a.possiblePoints, 0);
  const percentage =
    totalPossible > 0 ? Math.round((score / totalPossible) * 100) : 0;
  return { correct, incorrect, review, score, totalPossible, percentage };
}

export function createQuizAttempt(params: {
  studySetId: string;
  mode: QuizModeKind;
  questions: QuizQuestion[];
  answers: QuizAnswerResult[];
  startedAt: string;
}): QuizAttempt {
  const { correct, incorrect, review, score, totalPossible, percentage } =
    summarizeAnswers(params.answers);
  void correct;
  void incorrect;
  void review;

  return {
    id: createStudyId("attempt"),
    studySetId: params.studySetId,
    mode: params.mode,
    startedAt: params.startedAt,
    completedAt: new Date().toISOString(),
    questionIds: params.questions.map((q) => q.id),
    answers: params.answers,
    score,
    totalPossible,
    percentage,
    topicScores: buildTopicScores(params.questions, params.answers),
  };
}

export function appendQuizAttempt(
  studySet: StudySet,
  attempt: QuizAttempt
): StudySet {
  const attempts = [...(studySet.quizAttempts ?? []), attempt].slice(
    -MAX_QUIZ_ATTEMPTS_PER_SET
  );
  return {
    ...studySet,
    quizAttempts: attempts,
    updatedAt: new Date().toISOString(),
  };
}

export function getMissedQuestionIds(studySet: StudySet): string[] {
  const missed = new Set<string>();
  for (const attempt of studySet.quizAttempts ?? []) {
    for (const answer of attempt.answers) {
      if (answer.outcome === "incorrect" || answer.outcome === "review") {
        missed.add(answer.questionId);
      }
    }
  }
  // Remove questions later answered correctly in a more recent attempt.
  const ordered = [...(studySet.quizAttempts ?? [])].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt)
  );
  for (const attempt of ordered) {
    for (const answer of attempt.answers) {
      if (answer.outcome === "correct") missed.delete(answer.questionId);
      if (answer.outcome === "incorrect" || answer.outcome === "review") {
        missed.add(answer.questionId);
      }
    }
  }
  return Array.from(missed).filter((id) =>
    studySet.quizQuestions.some((q) => q.id === id)
  );
}

export function knowledgeLabel(percentage: number): string {
  if (percentage >= 90) return "Strong understanding";
  if (percentage >= 75) return "Good progress";
  if (percentage >= 60) return "Developing understanding";
  return "Needs more review";
}

export function topicStatusLabel(
  percentage: number,
  attempted: number
): "Strong" | "Developing" | "Review" | "Not enough practice yet" {
  if (attempted < 2) return "Not enough practice yet";
  if (percentage >= 80) return "Strong";
  if (percentage >= 60) return "Developing";
  return "Review";
}

/**
 * Estimated knowledge from completed quiz attempts.
 * - Latest attempt: 50%
 * - Average of earlier attempts: 30%
 * - Retry improvement bonus (latest missed-mode vs prior): 20%, else folds into average
 */
export function estimateOverallKnowledge(attempts: QuizAttempt[]): {
  estimated: number;
  latest: number | null;
  best: number | null;
  average: number | null;
  label: string;
} {
  if (attempts.length === 0) {
    return {
      estimated: 0,
      latest: null,
      best: null,
      average: null,
      label: "Not enough practice yet",
    };
  }

  const ordered = [...attempts].sort((a, b) =>
    a.completedAt.localeCompare(b.completedAt)
  );
  const latest = ordered[ordered.length - 1];
  const earlier = ordered.slice(0, -1);
  const percentages = ordered.map((a) => a.percentage);
  const best = Math.max(...percentages);
  const average = Math.round(
    percentages.reduce((s, p) => s + p, 0) / percentages.length
  );

  let estimated: number;
  if (earlier.length === 0) {
    estimated = latest.percentage;
  } else {
    const earlierAvg =
      earlier.reduce((s, a) => s + a.percentage, 0) / earlier.length;
    let retryBonus = earlierAvg;
    if (latest.mode === "missed") {
      const prior = earlier[earlier.length - 1];
      retryBonus = Math.min(
        100,
        Math.max(0, prior.percentage + (latest.percentage - prior.percentage))
      );
    }
    estimated = Math.round(
      latest.percentage * 0.5 + earlierAvg * 0.3 + retryBonus * 0.2
    );
  }

  return {
    estimated: Math.min(100, Math.max(0, estimated)),
    latest: latest.percentage,
    best,
    average,
    label: knowledgeLabel(estimated),
  };
}

export function aggregateTopicKnowledge(
  studySet: StudySet
): TopicScore[] {
  const map = new Map<string, { correct: number; attempted: number }>();
  const questionById = new Map(
    studySet.quizQuestions.map((q) => [q.id, q] as const)
  );

  for (const attempt of studySet.quizAttempts ?? []) {
    for (const answer of attempt.answers) {
      if (answer.outcome === "review") continue;
      const question = questionById.get(answer.questionId);
      if (!question) continue;
      const entry = map.get(question.topic) ?? { correct: 0, attempted: 0 };
      entry.attempted += 1;
      if (answer.outcome === "correct") entry.correct += 1;
      map.set(question.topic, entry);
    }
  }

  return Array.from(map.entries())
    .map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      attempted: stats.attempted,
      percentage:
        stats.attempted > 0
          ? Math.round((stats.correct / stats.attempted) * 100)
          : 0,
    }))
    .sort((a, b) => a.topic.localeCompare(b.topic));
}

export function aggregateTypePerformance(studySet: StudySet): Array<{
  type: QuizQuestionType;
  label: string;
  correct: number;
  attempted: number;
  percentage: number;
}> {
  const questionById = new Map(
    studySet.quizQuestions.map((q) => [q.id, q] as const)
  );
  const stats: Record<
    QuizQuestionType,
    { correct: number; attempted: number }
  > = {
    "multiple-choice": { correct: 0, attempted: 0 },
    "true-false": { correct: 0, attempted: 0 },
    "short-answer": { correct: 0, attempted: 0 },
  };

  for (const attempt of studySet.quizAttempts ?? []) {
    for (const answer of attempt.answers) {
      if (answer.outcome === "review") continue;
      const question = questionById.get(answer.questionId);
      if (!question) continue;
      stats[question.type].attempted += 1;
      if (answer.outcome === "correct") stats[question.type].correct += 1;
    }
  }

  return (
    [
      ["multiple-choice", "Multiple Choice"],
      ["true-false", "True or False"],
      ["short-answer", "Short Answer"],
    ] as const
  ).map(([type, label]) => {
    const s = stats[type];
    return {
      type,
      label,
      correct: s.correct,
      attempted: s.attempted,
      percentage:
        s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    };
  });
}

export function findRelatedMaterials(
  question: QuizQuestion,
  studySet: StudySet
): {
  flashcards: Flashcard[];
  vocabulary: StudyTerm[];
  definitions: StudyTerm[];
} {
  const keys = [
    question.topic,
    ...question.question.split(/\s+/).filter((w) => w.length > 4),
    question.correctAnswer,
  ]
    .map((k) => k.toLowerCase())
    .filter(Boolean);

  function matches(text: string): boolean {
    const lower = text.toLowerCase();
    return keys.some((k) => lower.includes(k) || k.includes(lower.slice(0, 12)));
  }

  return {
    flashcards: studySet.flashcards
      .filter((c) => matches(c.front) || matches(c.back))
      .slice(0, 3),
    vocabulary: studySet.vocabulary
      .filter((t) => matches(t.term) || matches(t.definition))
      .slice(0, 3),
    definitions: studySet.keyDefinitions
      .filter((t) => matches(t.term) || matches(t.definition))
      .slice(0, 3),
  };
}

export function filterQuizQuestions(
  questions: QuizQuestion[],
  options: {
    types: Set<QuizQuestionType>;
    difficulty: QuizDifficulty | "all";
    mode: QuizModeKind;
    missedIds: string[];
    limit: number | "all";
    /** When true, ignore type filter and keep any type (for single-form conversion). */
    includeAllTypes?: boolean;
  }
): QuizQuestion[] {
  let pool = options.includeAllTypes
    ? [...questions]
    : questions.filter((q) => options.types.has(q.type));
  if (options.difficulty !== "all") {
    pool = pool.filter((q) => q.difficulty === options.difficulty);
  }
  if (options.mode === "missed") {
    const missed = new Set(options.missedIds);
    pool = pool.filter((q) => missed.has(q.id));
  }
  pool = shuffleArray(pool);
  if (options.limit !== "all") {
    pool = pool.slice(0, options.limit);
  }
  return pool;
}

function uniqueChoices(values: string[], correctAnswer: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const key = normalizeShortAnswer(value);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(value.trim());
  };
  push(correctAnswer);
  for (const value of values) push(value);
  return result;
}

function gatherDistractors(
  question: QuizQuestion,
  bank: QuizQuestion[],
  correctAnswer: string
): string[] {
  const distractors: string[] = [];
  for (const other of bank) {
    if (other.id === question.id) continue;
    if (
      other.correctAnswer &&
      normalizeShortAnswer(other.correctAnswer) !==
        normalizeShortAnswer(correctAnswer)
    ) {
      distractors.push(other.correctAnswer);
    }
    for (const choice of other.choices ?? []) {
      if (
        normalizeShortAnswer(choice) !== normalizeShortAnswer(correctAnswer)
      ) {
        distractors.push(choice);
      }
    }
    for (const accepted of other.acceptedAnswers ?? []) {
      if (
        normalizeShortAnswer(accepted) !== normalizeShortAnswer(correctAnswer)
      ) {
        distractors.push(accepted);
      }
    }
  }
  return distractors;
}

function asTrueFalseAnswer(value: string): "True" | "False" {
  const normalized = normalizeShortAnswer(value);
  if (normalized === "false") return "False";
  return "True";
}

/**
 * Convert a question to another response form for a practice session.
 * Does not mutate the saved study-set question permanently.
 */
export function convertQuizQuestionToType(
  question: QuizQuestion,
  targetType: QuizQuestionType,
  bank: QuizQuestion[]
): QuizQuestion {
  if (question.type === targetType) {
    if (targetType === "true-false") {
      return {
        ...question,
        type: "true-false",
        choices: ["True", "False"],
        correctAnswer: asTrueFalseAnswer(question.correctAnswer),
        acceptedAnswers: undefined,
      };
    }
    if (targetType === "short-answer") {
      const accepted = uniqueChoices(
        [
          question.correctAnswer,
          ...(question.acceptedAnswers ?? []),
          ...(question.choices ?? []),
        ],
        question.correctAnswer
      ).slice(0, 8);
      return {
        ...question,
        type: "short-answer",
        choices: [],
        acceptedAnswers: accepted,
      };
    }
    if (
      targetType === "multiple-choice" &&
      question.choices &&
      question.choices.length >= 2
    ) {
      return question;
    }
  }

  if (targetType === "short-answer") {
    const accepted = uniqueChoices(
      [
        question.correctAnswer,
        ...(question.acceptedAnswers ?? []),
        ...(question.choices ?? []).filter(
          (c) =>
            normalizeShortAnswer(c) ===
            normalizeShortAnswer(question.correctAnswer)
        ),
      ],
      question.correctAnswer
    ).slice(0, 8);
    return {
      ...question,
      type: "short-answer",
      choices: [],
      correctAnswer: question.correctAnswer,
      acceptedAnswers: accepted,
    };
  }

  if (targetType === "true-false") {
    if (question.type === "true-false") {
      return {
        ...question,
        type: "true-false",
        choices: ["True", "False"],
        correctAnswer: asTrueFalseAnswer(question.correctAnswer),
        acceptedAnswers: undefined,
      };
    }

    const stem = question.question.replace(/\?+$/, "").trim();
    const distractors = gatherDistractors(
      question,
      bank,
      question.correctAnswer
    );
    const useFalse =
      distractors.length > 0 && Math.random() < 0.5;
    if (useFalse) {
      const wrong = distractors[0];
      return {
        ...question,
        type: "true-false",
        question: `${stem}. The answer is "${wrong}".`,
        choices: ["True", "False"],
        correctAnswer: "False",
        acceptedAnswers: undefined,
      };
    }
    return {
      ...question,
      type: "true-false",
      question: `${stem}. The answer is "${question.correctAnswer}".`,
      choices: ["True", "False"],
      correctAnswer: "True",
      acceptedAnswers: undefined,
    };
  }

  // multiple-choice
  const correct = question.correctAnswer;
  let choices = uniqueChoices(
    [
      correct,
      ...(question.choices ?? []),
      ...gatherDistractors(question, bank, correct),
    ],
    correct
  );

  if (question.type === "true-false") {
    choices = uniqueChoices(["True", "False", ...choices.slice(1)], correct);
  }

  // Prefer exactly 4 choices when possible
  if (choices.length > 4) {
    const rest = shuffleArray(choices.slice(1));
    choices = [choices[0], ...rest].slice(0, 4);
  } else if (choices.length < 4) {
    const fillers = gatherDistractors(question, bank, correct).filter(
      (d) =>
        !choices.some(
          (c) => normalizeShortAnswer(c) === normalizeShortAnswer(d)
        )
    );
    choices = uniqueChoices([...choices, ...fillers], correct).slice(0, 4);
  }

  // If still short (e.g. true/false source), keep at least 2 valid choices
  if (choices.length < 2) {
    choices = uniqueChoices([correct, "True", "False"], correct).slice(0, 4);
  }

  return {
    ...question,
    type: "multiple-choice",
    choices: shuffleArray(choices),
    correctAnswer: correct,
    acceptedAnswers: undefined,
  };
}

export function convertQuizQuestionsToType(
  questions: QuizQuestion[],
  targetType: QuizQuestionType,
  bank: QuizQuestion[]
): QuizQuestion[] {
  return questions.map((q) => convertQuizQuestionToType(q, targetType, bank));
}

export function typeLabel(type: QuizQuestionType): string {
  if (type === "multiple-choice") return "Multiple Choice";
  if (type === "true-false") return "True or False";
  return "Short Answer";
}

export function difficultyLabel(d: QuizDifficulty): string {
  if (d === "easy") return "Easy";
  if (d === "hard") return "Hard";
  return "Medium";
}
