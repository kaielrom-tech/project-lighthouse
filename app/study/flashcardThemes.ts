import type { Flashcard, StudyTerm, Subject } from "./types";

const SUBJECT_THEME: Record<
  Subject,
  NonNullable<Flashcard["design"]>["theme"]
> = {
  math: "math-grid",
  reading: "reading-page",
  writing: "writing-notes",
  science: "science-molecule",
  history: "history-timeline",
  general: "general-lighthouse",
};

const ALLOWED = new Set(Object.values(SUBJECT_THEME));

export function isFlashcardTheme(
  value: unknown
): value is NonNullable<Flashcard["design"]>["theme"] {
  return (
    typeof value === "string" &&
    ALLOWED.has(value as NonNullable<Flashcard["design"]>["theme"])
  );
}

/** Assign one subtle subject decoration. No AI styling. */
export function assignDesignsToFlashcards(
  cards: Flashcard[],
  subject: Subject
): Flashcard[] {
  const theme = SUBJECT_THEME[subject];
  return orderFlashcardsByLearningPurpose(
    cards.map((card) => ({
      ...card,
      design: {
        variant: "subject",
        theme,
        purpose: card.design?.purpose,
      },
    }))
  );
}

export function orderFlashcardsByLearningPurpose(
  cards: Flashcard[]
): Flashcard[] {
  const order: Record<string, number> = {
    remember: 0,
    understand: 1,
    process: 2,
    compare: 3,
    "cause-effect": 4,
    apply: 5,
  };
  return [...cards].sort((a, b) => {
    const aPurpose = a.design?.purpose ?? "remember";
    const bPurpose = b.design?.purpose ?? "remember";
    return (order[aPurpose] ?? 0) - (order[bPurpose] ?? 0);
  });
}

export function orderVocabularyByComplexity(terms: StudyTerm[]): StudyTerm[] {
  return [...terms].sort((a, b) => {
    const aScore =
      (a.definition?.length ?? 0) + (a.example ? 40 : 0) + a.term.length * 2;
    const bScore =
      (b.definition?.length ?? 0) + (b.example ? 40 : 0) + b.term.length * 2;
    return aScore - bScore;
  });
}

export function orderKeyDefinitions(terms: StudyTerm[]): StudyTerm[] {
  return [...terms].sort((a, b) => {
    const aHasWhy = a.whyItMatters ? 0 : 1;
    const bHasWhy = b.whyItMatters ? 0 : 1;
    if (aHasWhy !== bHasWhy) return aHasWhy - bHasWhy;
    return (a.definition?.length ?? 0) - (b.definition?.length ?? 0);
  });
}
