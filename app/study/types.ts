export type Grade =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12";

export type ExplanationStyle = "simple" | "normal" | "advanced";

export type Subject =
  | "math"
  | "reading"
  | "writing"
  | "science"
  | "history"
  | "general";

export type SourceType = "topic" | "learning-card" | "file" | "notes";

export type StudyContentKind =
  | "vocabulary"
  | "keyDefinitions"
  | "flashcards"
  | "quiz";

export type StudyTerm = {
  id: string;
  term: string;
  definition: string;
  example?: string;
  whyItMatters?: string;
};

export type Flashcard = {
  id: string;
  front: string;
  back: string;
  hint?: string;
  design?: {
    variant: "standard" | "subject" | "topic";
    theme:
      | "math-grid"
      | "reading-page"
      | "writing-notes"
      | "science-molecule"
      | "history-timeline"
      | "general-lighthouse"
      | "space"
      | "biology"
      | "geometry"
      | "literature";
    purpose?:
      | "remember"
      | "understand"
      | "apply"
      | "compare"
      | "process"
      | "cause-effect";
  };
};

export type QuizQuestionType =
  | "multiple-choice"
  | "true-false"
  | "short-answer";

export type QuizDifficulty = "easy" | "medium" | "hard";

export type QuizQuestion = {
  id: string;
  type: QuizQuestionType;
  question: string;
  choices?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  topic: string;
  difficulty: QuizDifficulty;
};

export type QuizAnswerResult = {
  questionId: string;
  userAnswer: string;
  /** correct | incorrect | review (close short-answer) */
  outcome: "correct" | "incorrect" | "review";
  isCorrect: boolean;
  earnedPoints: number;
  possiblePoints: number;
};

export type TopicScore = {
  topic: string;
  correct: number;
  attempted: number;
  percentage: number;
};

export type QuizModeKind = "full" | "missed";

export type QuizAttempt = {
  id: string;
  studySetId: string;
  mode: QuizModeKind;
  startedAt: string;
  completedAt: string;
  questionIds: string[];
  answers: QuizAnswerResult[];
  score: number;
  totalPossible: number;
  percentage: number;
  topicScores: TopicScore[];
};

export type StudySet = {
  id: string;
  title: string;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
  sourceType: SourceType;
  sourceLabel: string;
  /** Text used for generation (topic, notes, or card summary). Never store file bytes. */
  sourceText: string;
  vocabulary: StudyTerm[];
  keyDefinitions: StudyTerm[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  quizAttempts: QuizAttempt[];
  createdAt: string;
  updatedAt?: string;
  reviewStats?: {
    lastCompletedAt?: string;
    gotItCount?: number;
    totalReviewed?: number;
  };
};

export type LearningCardOption = {
  id: string;
  title: string;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
  sourceText: string;
  /** Short preview of the tutor answer for selection lists. */
  answerPreview?: string;
};

export type StudyDraft = {
  sourceType: SourceType;
  sourceText: string;
  sourceLabel: string;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
  selectedCardId?: string;
} | null;

export type GenerateStudyRequest = {
  sourceType: SourceType;
  sourceText: string;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
  include: {
    vocabulary: boolean;
    keyDefinitions: boolean;
    flashcards: boolean;
    quiz: boolean;
  };
  counts: {
    vocabulary: 5 | 10 | 15;
    keyDefinitions: 5 | 10 | 15;
    flashcards: 5 | 10 | 20;
    quiz: 5 | 10 | 15 | 20;
  };
  quizTypes?: {
    multipleChoice: boolean;
    trueFalse: boolean;
    shortAnswer: boolean;
  };
};

export type GenerateStudyResponse = {
  title: string;
  vocabulary: StudyTerm[];
  keyDefinitions: StudyTerm[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  warnings?: string[];
};

export function createStudyId(prefix = "study"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Keep only the most recent attempts to limit localStorage growth. */
export const MAX_QUIZ_ATTEMPTS_PER_SET = 20;
