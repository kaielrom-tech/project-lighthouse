"use client";

import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import PageHeader from "../components/PageHeader";
import SubjectNav, { SubjectIcon } from "../components/SubjectNav";
import type { SubjectFilter } from "../components/SubjectNav";
import {
  formatUpdatedAt,
  GRADE_LABELS,
  STYLE_LABELS,
  SUBJECT_LABELS,
} from "./labels";
import type { StudySet, Subject } from "./types";
import styles from "./study.module.css";

type StudyToolsHomeProps = {
  studySets: StudySet[];
  subjectFilter: SubjectFilter;
  onSubjectFilterChange: (filter: SubjectFilter) => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};

export default function StudyToolsHome({
  studySets,
  subjectFilter,
  onSubjectFilterChange,
  onCreate,
  onOpen,
  onRename,
  onDelete,
}: StudyToolsHomeProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const filtered = useMemo(() => {
    const list =
      subjectFilter === "all"
        ? studySets
        : studySets.filter((set) => set.subject === subjectFilter);
    return [...list].sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || a.createdAt);
      const bTime = Date.parse(b.updatedAt || b.createdAt);
      return bTime - aTime;
    });
  }, [studySets, subjectFilter]);

  function startRename(set: StudySet) {
    setMenuOpenId(null);
    setRenamingId(set.id);
    setRenameValue(set.title);
  }

  function saveRename(id: string) {
    const next = renameValue.trim();
    if (next) onRename(id, next);
    setRenamingId(null);
    setRenameValue("");
  }

  const subjectLabel =
    subjectFilter === "all" ? null : SUBJECT_LABELS[subjectFilter as Subject];

  return (
    <div className={styles.workspace}>
      <PageHeader
        title="Study Tools"
        description="Create flashcards, vocabulary, and key definitions from your learning material."
        actions={
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onCreate}
          >
            Create Study Set
          </button>
        }
      />

      <SubjectNav
        value={subjectFilter}
        onChange={onSubjectFilterChange}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={
            subjectLabel
              ? `No ${subjectLabel.toLowerCase()} study sets yet.`
              : "No study sets yet"
          }
          description="Turn a topic, notes, Tutor explanation, PDF, or image into study material."
          action={
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onCreate}
            >
              Create Study Set
            </button>
          }
          note="Study sets are saved in this browser."
        />
      ) : (
        <>
          <ul className={styles.setRows}>
            {filtered.map((set) => (
              <li key={set.id} className={styles.setRow}>
                <div className={styles.setRowIcon} data-subject={set.subject}>
                  <SubjectIcon subject={set.subject} />
                </div>
                <div className={styles.setRowMain}>
                  {renamingId === set.id ? (
                    <div className={styles.renameInline}>
                      <input
                        className={styles.textInput}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        aria-label="Rename study set"
                      />
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => saveRename(set.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => setRenamingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className={styles.setRowTitle}>{set.title}</h2>
                      <p className={styles.setRowMeta}>
                        {SUBJECT_LABELS[set.subject]} ·{" "}
                        {GRADE_LABELS[set.grade]} ·{" "}
                        {STYLE_LABELS[set.explanationStyle]}
                      </p>
                      <p className={styles.setRowMeta}>
                        {[
                          set.flashcards.length > 0 ? "Flashcards" : null,
                          set.vocabulary.length > 0 ? "Vocabulary" : null,
                          set.keyDefinitions.length > 0
                            ? "Key Definitions"
                            : null,
                          (set.quizQuestions?.length ?? 0) > 0 ? "Quiz" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No tools yet"}
                        {" · Updated "}
                        {formatUpdatedAt(set.updatedAt || set.createdAt)}
                      </p>
                    </>
                  )}
                </div>

                <div className={styles.setRowActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => onOpen(set.id)}
                  >
                    Open
                  </button>
                  <div className={styles.menuWrap}>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`More actions for ${set.title}`}
                      aria-expanded={menuOpenId === set.id}
                      onClick={() =>
                        setMenuOpenId((current) =>
                          current === set.id ? null : set.id
                        )
                      }
                    >
                      ···
                    </button>
                    {menuOpenId === set.id && (
                      <div className={styles.menuPanel} role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => startRename(set)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuOpenId(null);
                            onDelete(set.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className={styles.storageNote}>
            Study sets are saved in this browser.
          </p>
        </>
      )}
    </div>
  );
}
