import type {
  ExplanationStyle,
  Grade,
  SourceType,
  Subject,
} from "../types";

export type BuilderStep = 1 | 2 | 3 | 4;

export type BuilderDraft = {
  step: BuilderStep;
  highestStepReached: BuilderStep;
  sourceType: SourceType | null;
  topic: string;
  topicInstructions: string;
  notes: string;
  selectedCardId: string;
  fileNotes: string;
  fileFocus: string;
  title: string;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
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
  titleEdited: boolean;
};

export function createInitialBuilderDraft(
  subject: Subject,
  grade: Grade,
  explanationStyle: ExplanationStyle
): BuilderDraft {
  return {
    step: 1,
    highestStepReached: 1,
    sourceType: null,
    topic: "",
    topicInstructions: "",
    notes: "",
    selectedCardId: "",
    fileNotes: "",
    fileFocus: "",
    title: "",
    subject,
    grade,
    explanationStyle,
    includeVocabulary: false,
    includeDefinitions: true,
    includeFlashcards: true,
    includeQuiz: false,
    vocabCount: 10,
    definitionCount: 10,
    flashcardCount: 10,
    quizCount: 10,
    quizMultipleChoice: true,
    quizTrueFalse: true,
    quizShortAnswer: true,
    titleEdited: false,
  };
}

export function builderHasEnteredWork(
  draft: BuilderDraft,
  hasFile: boolean
): boolean {
  return Boolean(
    draft.sourceType ||
      draft.topic.trim() ||
      draft.topicInstructions.trim() ||
      draft.notes.trim() ||
      draft.selectedCardId ||
      draft.fileNotes.trim() ||
      draft.fileFocus.trim() ||
      draft.title.trim() ||
      hasFile
  );
}

export function suggestTitle(
  draft: BuilderDraft,
  fileName?: string | null
): string {
  if (draft.titleEdited && draft.title.trim()) return draft.title.trim();
  if (draft.sourceType === "topic" && draft.topic.trim()) {
    return draft.topic.trim().slice(0, 80);
  }
  if (draft.sourceType === "notes" && draft.notes.trim()) {
    return "Notes study set";
  }
  if (draft.sourceType === "learning-card") {
    return "Learning conversation study set";
  }
  if (draft.sourceType === "file" && fileName) {
    return fileName.replace(/\.[^.]+$/, "").slice(0, 80);
  }
  if (draft.title.trim()) return draft.title.trim();
  return "New study set";
}
