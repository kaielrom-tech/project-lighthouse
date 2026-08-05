"use client";

import { useCallback, useEffect, useState } from "react";
import DefinitionsView from "./DefinitionsView";
import FlashcardList from "./FlashcardList";
import FlashcardMode from "./FlashcardMode";
import LearnHub from "./LearnHub";
import ProgressView from "./ProgressView";
import QuizMode from "./QuizMode";
import StudySetBuilder from "./StudySetBuilder";
import StudySetOverview from "./StudySetOverview";
import type { OverviewToolId } from "./StudySetOverview";
import StudyToolsHome from "./StudyToolsHome";
import VocabularyView from "./VocabularyView";
import { loadStudySets, saveStudySets } from "./storage";
import type {
  ExplanationStyle,
  Grade,
  LearningCardOption,
  StudyDraft,
  StudySet,
  Subject,
} from "./types";
import styles from "./study.module.css";

type StudyToolsProps = {
  defaultSubject: Subject;
  defaultGrade: Grade;
  defaultExplanationStyle: ExplanationStyle;
  subjectFilter: "all" | Subject;
  onSubjectFilterChange: (filter: "all" | Subject) => void;
  learningCards: LearningCardOption[];
  draft: StudyDraft;
  onDraftConsumed: () => void;
};

type StudyView =
  | { name: "home" }
  | { name: "create" }
  | { name: "overview"; setId: string }
  | { name: "learn"; setId: string }
  | { name: "vocabulary"; setId: string }
  | { name: "definitions"; setId: string }
  | { name: "flashcards"; setId: string }
  | { name: "flashcard-list"; setId: string }
  | { name: "quiz"; setId: string; attemptId?: string }
  | { name: "progress"; setId: string };

export default function StudyTools({
  defaultSubject,
  defaultGrade,
  defaultExplanationStyle,
  subjectFilter,
  onSubjectFilterChange,
  learningCards,
  draft,
  onDraftConsumed,
}: StudyToolsProps) {
  const [view, setView] = useState<StudyView>({ name: "home" });
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [createDraft, setCreateDraft] = useState<StudyDraft>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setStudySets(loadStudySets());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    saveStudySets(studySets);
  }, [studySets, storageReady]);

  useEffect(() => {
    if (!draft) return;
    setCreateDraft(draft);
    setView({ name: "create" });
    onDraftConsumed();
  }, [draft, onDraftConsumed]);

  const getSet = useCallback(
    (id: string) => studySets.find((set) => set.id === id) ?? null,
    [studySets]
  );

  function updateStudySet(next: StudySet) {
    setStudySets((prev) =>
      prev.map((set) => (set.id === next.id ? next : set))
    );
  }

  function deleteStudySet(id: string) {
    const confirmed = window.confirm(
      "Delete this study set? This cannot be undone in this browser."
    );
    if (!confirmed) return;
    setStudySets((prev) => prev.filter((set) => set.id !== id));
    setView({ name: "home" });
    setWarning(null);
    setSuccessMessage(null);
  }

  function renameStudySet(id: string, title: string) {
    setStudySets((prev) =>
      prev.map((set) =>
        set.id === id
          ? { ...set, title, updatedAt: new Date().toISOString() }
          : set
      )
    );
  }

  function openOverviewTool(studySet: StudySet, tool: OverviewToolId) {
    setSuccessMessage(null);
    if (tool === "learn") {
      const hasVocab = studySet.vocabulary.length > 0;
      const hasDefs = studySet.keyDefinitions.length > 0;
      if (hasVocab && hasDefs) {
        setView({ name: "learn", setId: studySet.id });
      } else if (hasVocab) {
        setView({ name: "vocabulary", setId: studySet.id });
      } else {
        setView({ name: "definitions", setId: studySet.id });
      }
      return;
    }
    if (tool === "flashcards") {
      setView({ name: "flashcards", setId: studySet.id });
      return;
    }
    if (tool === "quiz") {
      setView({ name: "quiz", setId: studySet.id });
      return;
    }
    setView({ name: "progress", setId: studySet.id });
  }

  const builderDefaultSubject =
    subjectFilter === "all" ? defaultSubject : subjectFilter;

  if (view.name === "create") {
    return (
      <div className={styles.studyShell}>
        <StudySetBuilder
          defaultSubject={builderDefaultSubject}
          defaultGrade={defaultGrade}
          defaultExplanationStyle={defaultExplanationStyle}
          learningCards={learningCards}
          draft={createDraft}
          onCancel={() => {
            setCreateDraft(null);
            setView({ name: "home" });
          }}
          onCreated={(set, warnings) => {
            setStudySets((prev) => [set, ...prev]);
            setCreateDraft(null);
            setWarning(
              warnings.length > 0
                ? `Some sections needed cleanup: ${warnings.join(" ")}`
                : null
            );
            setSuccessMessage("Your study set is ready.");
            onSubjectFilterChange(set.subject);
            setView({ name: "overview", setId: set.id });
          }}
        />
      </div>
    );
  }

  if (view.name !== "home") {
    const studySet = getSet(view.setId);
    if (!studySet) {
      return (
        <div className={styles.studyShell}>
          <div className={styles.fullscreenState}>
            <p className={styles.mutedText}>That study set could not be found.</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => setView({ name: "home" })}
            >
              Back to Study Tools
            </button>
          </div>
        </div>
      );
    }

    if (view.name === "overview") {
      return (
        <div className={styles.studyShell}>
          <StudySetOverview
            studySet={studySet}
            warning={warning}
            successMessage={successMessage}
            onBack={() => {
              setWarning(null);
              setSuccessMessage(null);
              setView({ name: "home" });
            }}
            onOpenTool={(tool) => openOverviewTool(studySet, tool)}
            onUpdate={updateStudySet}
            onDelete={() => deleteStudySet(studySet.id)}
          />
        </div>
      );
    }

    if (view.name === "learn") {
      return (
        <div className={styles.studyShell}>
          <LearnHub
            studySet={studySet}
            onBack={() => setView({ name: "overview", setId: studySet.id })}
            onOpenVocabulary={() =>
              setView({ name: "vocabulary", setId: studySet.id })
            }
            onOpenDefinitions={() =>
              setView({ name: "definitions", setId: studySet.id })
            }
          />
        </div>
      );
    }

    if (view.name === "vocabulary") {
      return (
        <div className={styles.studyShell}>
          <VocabularyView
            studySet={studySet}
            onBack={() => setView({ name: "overview", setId: studySet.id })}
            onUpdate={updateStudySet}
          />
        </div>
      );
    }

    if (view.name === "definitions") {
      return (
        <div className={styles.studyShell}>
          <DefinitionsView
            studySet={studySet}
            onBack={() => setView({ name: "overview", setId: studySet.id })}
          />
        </div>
      );
    }

    if (view.name === "flashcards") {
      return (
        <div className={styles.studyShell}>
          <FlashcardMode
            studySet={studySet}
            onBack={() => setView({ name: "overview", setId: studySet.id })}
            onOpenList={() =>
              setView({ name: "flashcard-list", setId: studySet.id })
            }
          />
        </div>
      );
    }

    if (view.name === "flashcard-list") {
      return (
        <div className={styles.studyShell}>
          <FlashcardList
            studySet={studySet}
            onBack={() => setView({ name: "flashcards", setId: studySet.id })}
          />
        </div>
      );
    }

    if (view.name === "quiz") {
      return (
        <div className={styles.studyShell}>
          <QuizMode
            key={`${studySet.id}-${view.attemptId ?? "new"}`}
            studySet={studySet}
            initialAttemptId={view.attemptId ?? null}
            onBack={() => setView({ name: "overview", setId: studySet.id })}
            onUpdate={updateStudySet}
          />
        </div>
      );
    }

    if (view.name === "progress") {
      return (
        <div className={styles.studyShell}>
          <ProgressView
            studySet={studySet}
            onBack={() => setView({ name: "overview", setId: studySet.id })}
            onStartQuiz={() =>
              setView({ name: "quiz", setId: studySet.id })
            }
            onOpenAttempt={(attemptId) =>
              setView({ name: "quiz", setId: studySet.id, attemptId })
            }
          />
        </div>
      );
    }
  }

  return (
    <div className={styles.studyShell}>
      <StudyToolsHome
        studySets={studySets}
        subjectFilter={subjectFilter}
        onSubjectFilterChange={onSubjectFilterChange}
        onCreate={() => {
          setCreateDraft(null);
          setSuccessMessage(null);
          setView({ name: "create" });
        }}
        onOpen={(id) => {
          setSuccessMessage(null);
          setView({ name: "overview", setId: id });
        }}
        onRename={renameStudySet}
        onDelete={deleteStudySet}
      />
    </div>
  );
}
