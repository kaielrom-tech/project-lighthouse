"use client";

import { useEffect, useRef, useState } from "react";
import {
  assignDesignsToFlashcards,
  orderKeyDefinitions,
  orderVocabularyByComplexity,
} from "./flashcardThemes";
import type {
  ExplanationStyle,
  GenerateStudyResponse,
  Grade,
  LearningCardOption,
  SourceType,
  StudyDraft,
  StudySet,
  Subject,
} from "./types";
import { createStudyId } from "./types";
import GeneratingView from "./builder/GeneratingView";
import MaterialStep, { resolveMimeType } from "./builder/MaterialStep";
import ReviewStep from "./builder/ReviewStep";
import SetupStep from "./builder/SetupStep";
import ToolsStep from "./builder/ToolsStep";
import {
  builderHasEnteredWork,
  createInitialBuilderDraft,
  suggestTitle,
  type BuilderDraft,
  type BuilderStep,
} from "./builder/types";
import styles from "./study.module.css";

const LOADING_MESSAGES = [
  "Reading your material…",
  "Finding the most important ideas…",
  "Creating clear study material…",
  "Organizing your study set…",
];

type StudySetBuilderProps = {
  defaultSubject: Subject;
  defaultGrade: Grade;
  defaultExplanationStyle: ExplanationStyle;
  learningCards: LearningCardOption[];
  draft: StudyDraft;
  onCancel: () => void;
  onCreated: (set: StudySet, warnings: string[]) => void;
};

export default function StudySetBuilder({
  defaultSubject,
  defaultGrade,
  defaultExplanationStyle,
  learningCards,
  draft,
  onCancel,
  onCreated,
}: StudySetBuilderProps) {
  const [builder, setBuilder] = useState<BuilderDraft>(() =>
    createInitialBuilderDraft(
      defaultSubject,
      defaultGrade,
      defaultExplanationStyle
    )
  );
  const [phase, setPhase] = useState<"steps" | "generating">("steps");
  const [file, setFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const draftApplied = useRef(false);

  useEffect(() => {
    if (!draft || draftApplied.current) return;
    draftApplied.current = true;
    setBuilder((prev) => ({
      ...prev,
      step: 1,
      highestStepReached: 1,
      sourceType: draft.sourceType,
      subject: draft.subject,
      grade: draft.grade,
      explanationStyle: draft.explanationStyle,
      selectedCardId: draft.selectedCardId ?? "",
      topic: draft.sourceType === "topic" ? draft.sourceText : prev.topic,
      notes:
        draft.sourceType === "notes" || draft.sourceType === "learning-card"
          ? draft.sourceText
          : prev.notes,
      title: suggestTitle(
        {
          ...prev,
          sourceType: draft.sourceType,
          topic: draft.sourceType === "topic" ? draft.sourceText : "",
        },
        null
      ),
    }));
  }, [draft]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  function updateBuilder(patch: Partial<BuilderDraft>) {
    setBuilder((prev) => ({ ...prev, ...patch }));
  }

  function goToStep(step: BuilderStep) {
    if (step > builder.highestStepReached) return;
    setError(null);
    updateBuilder({ step });
  }

  function advance(next: BuilderStep) {
    setError(null);
    setBuilder((prev) => ({
      ...prev,
      step: next,
      highestStepReached: Math.max(prev.highestStepReached, next) as BuilderStep,
    }));
  }

  function handleCancel() {
    if (
      builderHasEnteredWork(builder, Boolean(file)) &&
      !window.confirm(
        "Discard this study set setup? Your entered material will be lost."
      )
    ) {
      return;
    }
    onCancel();
  }

  function handleSourceSelect(sourceType: SourceType) {
    setFile(null);
    setFileError(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    updateBuilder({
      sourceType,
      topic: sourceType === "topic" ? builder.topic : "",
      notes: sourceType === "notes" ? builder.notes : "",
      selectedCardId: sourceType === "learning-card" ? builder.selectedCardId : "",
      fileNotes: "",
      fileFocus: "",
      topicInstructions: "",
    });
  }

  function buildSourcePayload(): {
    sourceType: SourceType;
    sourceText: string;
    sourceLabel: string;
  } | null {
    const sourceType = builder.sourceType;
    if (!sourceType) {
      setError("Choose a source first.");
      return null;
    }
    if (sourceType === "topic") {
      const trimmed = builder.topic.trim();
      if (!trimmed) {
        setError("Please type a topic to study.");
        return null;
      }
      const instructions = builder.topicInstructions.trim();
      return {
        sourceType,
        sourceText: instructions
          ? `${trimmed}\n\nFocus instructions: ${instructions}`
          : trimmed,
        sourceLabel: `Topic: ${trimmed}`,
      };
    }
    if (sourceType === "notes") {
      const trimmed = builder.notes.trim();
      if (trimmed.length < 20) {
        setError("Please paste meaningful notes before continuing.");
        return null;
      }
      return {
        sourceType,
        sourceText: trimmed,
        sourceLabel: "Pasted notes",
      };
    }
    if (sourceType === "learning-card") {
      const card = learningCards.find(
        (item) => item.id === builder.selectedCardId
      );
      if (!card) {
        setError("Choose an AI learning card to use as the source.");
        return null;
      }
      return {
        sourceType,
        sourceText: card.sourceText,
        sourceLabel: `Learning card: ${card.title}`,
      };
    }
    if (!file) {
      setError("Please upload a PDF or image.");
      return null;
    }
    const notes = builder.fileNotes.trim();
    const focus = builder.fileFocus.trim();
    const parts = [
      notes ? `Additional writing from the student:\n${notes}` : "",
      focus ? `Focus instructions: ${focus}` : "",
    ].filter(Boolean);
    return {
      sourceType: "file",
      sourceText:
        parts.join("\n\n") ||
        "Create study materials based on the uploaded school document.",
      sourceLabel: `File: ${file.name}`,
    };
  }

  async function handleGenerate() {
    if (isGenerating) return;

    const source = buildSourcePayload();
    if (!source) {
      setPhase("steps");
      updateBuilder({ step: 1 });
      return;
    }

    if (
      !builder.includeVocabulary &&
      !builder.includeDefinitions &&
      !builder.includeFlashcards &&
      !builder.includeQuiz
    ) {
      setError("Choose at least one content type to generate.");
      setPhase("steps");
      updateBuilder({ step: 2 });
      return;
    }

    if (
      builder.includeQuiz &&
      !builder.quizMultipleChoice &&
      !builder.quizTrueFalse &&
      !builder.quizShortAnswer
    ) {
      setError("Choose at least one quiz question type.");
      setPhase("steps");
      updateBuilder({ step: 2 });
      return;
    }

    const title =
      builder.title.trim() || suggestTitle(builder, file?.name ?? null);

    setIsGenerating(true);
    setError(null);
    setPhase("generating");
    setLoadingMessage(LOADING_MESSAGES[0]);

    const messageTimer = window.setInterval(() => {
      setLoadingMessage((current) => {
        const index = LOADING_MESSAGES.indexOf(current);
        return LOADING_MESSAGES[(index + 1) % LOADING_MESSAGES.length];
      });
    }, 2800);

    try {
      const include = {
        vocabulary: builder.includeVocabulary,
        keyDefinitions: builder.includeDefinitions,
        flashcards: builder.includeFlashcards,
        quiz: builder.includeQuiz,
      };
      const counts = {
        vocabulary: builder.vocabCount,
        keyDefinitions: builder.definitionCount,
        flashcards: builder.flashcardCount,
        quiz: builder.quizCount,
      };
      const quizTypes = {
        multipleChoice: builder.quizMultipleChoice,
        trueFalse: builder.quizTrueFalse,
        shortAnswer: builder.quizShortAnswer,
      };

      let response: Response;
      if (source.sourceType === "file" && file) {
        const formData = new FormData();
        formData.append("sourceType", "file");
        formData.append("sourceText", source.sourceText);
        formData.append("subject", builder.subject);
        formData.append("grade", builder.grade);
        formData.append("explanationStyle", builder.explanationStyle);
        formData.append("include", JSON.stringify(include));
        formData.append("counts", JSON.stringify(counts));
        formData.append("quizTypes", JSON.stringify(quizTypes));
        formData.append("attachment", file, file.name);
        formData.append("attachmentFilename", file.name);
        formData.append(
          "attachmentMimeType",
          resolveMimeType(file) || file.type
        );
        response = await fetch("/api/study/generate", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/study/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: source.sourceType,
            sourceText: source.sourceText,
            subject: builder.subject,
            grade: builder.grade,
            explanationStyle: builder.explanationStyle,
            include,
            counts,
            quizTypes,
          }),
        });
      }

      const data = (await response.json()) as GenerateStudyResponse & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not build your study set.");
      }

      const now = new Date().toISOString();
      const newSet: StudySet = {
        id: createStudyId("set"),
        title: title.trim() || data.title || source.sourceLabel.slice(0, 80),
        subject: builder.subject,
        grade: builder.grade,
        explanationStyle: builder.explanationStyle,
        sourceType: source.sourceType,
        sourceLabel: source.sourceLabel,
        sourceText: source.sourceText,
        vocabulary: orderVocabularyByComplexity(data.vocabulary ?? []),
        keyDefinitions: orderKeyDefinitions(data.keyDefinitions ?? []),
        flashcards: assignDesignsToFlashcards(
          data.flashcards ?? [],
          builder.subject
        ),
        quizQuestions: data.quizQuestions ?? [],
        quizAttempts: [],
        createdAt: now,
        updatedAt: now,
      };

      onCreated(newSet, Array.isArray(data.warnings) ? data.warnings : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not build your study set. Please try again."
      );
      setPhase("generating");
    } finally {
      window.clearInterval(messageTimer);
      setIsGenerating(false);
    }
  }

  if (phase === "generating") {
    return (
      <GeneratingView
        title={builder.title || suggestTitle(builder, file?.name ?? null)}
        message={loadingMessage}
        error={isGenerating ? null : error}
        onRetry={() => {
          void handleGenerate();
        }}
        onBackToReview={() => {
          setError(null);
          setPhase("steps");
          updateBuilder({ step: 4 });
        }}
      />
    );
  }

  return (
    <div className={styles.workspace}>
      {builder.step === 1 && (
        <MaterialStep
          sourceType={builder.sourceType}
          topic={builder.topic}
          topicInstructions={builder.topicInstructions}
          notes={builder.notes}
          selectedCardId={builder.selectedCardId}
          file={file}
          filePreviewUrl={filePreviewUrl}
          fileNotes={builder.fileNotes}
          fileFocus={builder.fileFocus}
          fileError={fileError}
          subject={builder.subject}
          grade={builder.grade}
          explanationStyle={builder.explanationStyle}
          learningCards={learningCards}
          onSelectSource={handleSourceSelect}
          onTopicChange={(topic) => {
            const nextTitle = builder.titleEdited
              ? builder.title
              : suggestTitle({ ...builder, topic }, file?.name);
            updateBuilder({ topic, title: nextTitle });
          }}
          onTopicInstructionsChange={(topicInstructions) =>
            updateBuilder({ topicInstructions })
          }
          onNotesChange={(notes) => updateBuilder({ notes })}
          onSelectCard={(card) =>
            updateBuilder({
              selectedCardId: card.id,
              notes: card.sourceText,
              subject: card.subject,
              grade: card.grade,
              explanationStyle: card.explanationStyle,
              title: builder.titleEdited
                ? builder.title
                : card.title.slice(0, 80),
            })
          }
          onFileSelected={(nextFile, previewUrl, nextError) => {
            if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
            setFile(nextFile);
            setFilePreviewUrl(previewUrl);
            setFileError(nextError);
            if (nextFile && !builder.titleEdited) {
              updateBuilder({
                title: suggestTitle(builder, nextFile.name),
              });
            }
          }}
          onFileFocusChange={(fileFocus) => updateBuilder({ fileFocus })}
          onFileNotesChange={(fileNotes) => updateBuilder({ fileNotes })}
          onContinue={() => {
            if (!buildSourcePayload()) return;
            if (!builder.title.trim()) {
              updateBuilder({
                title: suggestTitle(builder, file?.name ?? null),
              });
            }
            advance(2);
          }}
          onCancel={handleCancel}
        />
      )}

      {builder.step === 2 && (
        <ToolsStep
          includeVocabulary={builder.includeVocabulary}
          includeDefinitions={builder.includeDefinitions}
          includeFlashcards={builder.includeFlashcards}
          includeQuiz={builder.includeQuiz}
          vocabCount={builder.vocabCount}
          definitionCount={builder.definitionCount}
          flashcardCount={builder.flashcardCount}
          quizCount={builder.quizCount}
          quizMultipleChoice={builder.quizMultipleChoice}
          quizTrueFalse={builder.quizTrueFalse}
          quizShortAnswer={builder.quizShortAnswer}
          onToggle={(key, value) => updateBuilder({ [key]: value })}
          onCountChange={(key, value) =>
            updateBuilder({ [key]: value } as Partial<BuilderDraft>)
          }
          onQuizTypeChange={(key, value) => updateBuilder({ [key]: value })}
          onBack={() => goToStep(1)}
          onContinue={() => advance(3)}
          onCancel={handleCancel}
        />
      )}

      {builder.step === 3 && (
        <SetupStep
          title={builder.title}
          subject={builder.subject}
          grade={builder.grade}
          explanationStyle={builder.explanationStyle}
          onTitleChange={(title) =>
            updateBuilder({ title, titleEdited: true })
          }
          onSubjectChange={(subject) => updateBuilder({ subject })}
          onGradeChange={(grade) => updateBuilder({ grade })}
          onStyleChange={(explanationStyle) =>
            updateBuilder({ explanationStyle })
          }
          onBack={() => goToStep(2)}
          onContinue={() => {
            if (!builder.title.trim()) {
              updateBuilder({
                title: suggestTitle(builder, file?.name ?? null),
              });
            }
            advance(4);
          }}
          onCancel={handleCancel}
        />
      )}

      {builder.step === 4 && (
        <ReviewStep
          draft={builder}
          file={file}
          learningCards={learningCards}
          error={error}
          onEdit={goToStep}
          onBack={() => goToStep(3)}
          onCancel={handleCancel}
          onGenerate={() => {
            void handleGenerate();
          }}
        />
      )}
    </div>
  );
}
