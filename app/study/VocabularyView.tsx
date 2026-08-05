"use client";

import { FormEvent, useMemo, useState } from "react";
import { SubjectIcon } from "../components/SubjectNav";
import type { StudySet } from "./types";
import { createStudyId } from "./types";
import styles from "./study.module.css";

type VocabularyViewProps = {
  studySet: StudySet;
  onBack: () => void;
  onUpdate: (next: StudySet) => void;
};

type TermResult = "correct" | "incorrect" | null;

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function answersMatch(expectedRaw: string, givenRaw: string): boolean {
  const expected = normalizeAnswer(expectedRaw);
  const given = normalizeAnswer(givenRaw);
  if (!given || !expected) return false;
  if (expected === given) return true;
  if (given.includes(expected) || expected.includes(given)) {
    const shorter = Math.min(expected.length, given.length);
    const longer = Math.max(expected.length, given.length);
    if (shorter >= 8 && shorter / longer >= 0.55) return true;
  }
  const expectedWords = expected.split(" ").filter((word) => word.length > 3);
  if (expectedWords.length === 0) return false;
  const matched = expectedWords.filter((word) => given.includes(word)).length;
  return matched / expectedWords.length >= 0.6;
}

export default function VocabularyView({
  studySet,
  onBack,
  onUpdate,
}: VocabularyViewProps) {
  const [search, setSearch] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, TermResult>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return studySet.vocabulary;
    return studySet.vocabulary.filter((item) => {
      const term = item.term.toLowerCase();
      const definition = item.definition.toLowerCase();
      return term.includes(query) || definition.includes(query);
    });
  }, [search, studySet.vocabulary]);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setResults((prev) => ({ ...prev, [id]: null }));
  }

  function checkAnswer(id: string, definition: string) {
    const given = answers[id] ?? "";
    if (!given.trim()) return;
    const correct = answersMatch(definition, given);
    setResults((prev) => ({
      ...prev,
      [id]: correct ? "correct" : "incorrect",
    }));
    if (correct) setRevealed((prev) => ({ ...prev, [id]: true }));
  }

  function revealAnswer(id: string) {
    setRevealed((prev) => ({ ...prev, [id]: true }));
    setResults((prev) => ({ ...prev, [id]: null }));
  }

  function hideAnswer(id: string) {
    setRevealed((prev) => ({ ...prev, [id]: false }));
    setResults((prev) => ({ ...prev, [id]: null }));
    setAnswers((prev) => ({ ...prev, [id]: "" }));
  }

  function handleCheckSubmit(
    event: FormEvent,
    id: string,
    definition: string
  ) {
    event.preventDefault();
    checkAnswer(id, definition);
  }

  function convertToFlashcard(termId: string) {
    const term = studySet.vocabulary.find((item) => item.id === termId);
    if (!term) return;
    const frontKey = term.term.trim().toLowerCase();
    if (!frontKey) return;
    if (
      studySet.flashcards.some(
        (card) => card.front.trim().toLowerCase() === frontKey
      )
    ) {
      return;
    }
    onUpdate({
      ...studySet,
      flashcards: [
        ...studySet.flashcards,
        {
          id: createStudyId("card"),
          front: term.term,
          back: term.definition,
          hint: term.example,
        },
      ],
      updatedAt: new Date().toISOString(),
    });
  }

  function isAlreadyFlashcard(term: string): boolean {
    const frontKey = term.trim().toLowerCase();
    return studySet.flashcards.some(
      (card) => card.front.trim().toLowerCase() === frontKey
    );
  }

  return (
    <div className={styles.workspace}>
      <button type="button" className={styles.textButton} onClick={onBack}>
        ← Back
      </button>
      <div className={styles.overviewTitleRow}>
        <SubjectIcon subject={studySet.subject} />
        <h1 className={styles.pageTitle}>{studySet.title}</h1>
      </div>
      <p className={styles.mutedText}>
        {studySet.vocabulary.length} term
        {studySet.vocabulary.length === 1 ? "" : "s"}
      </p>

      <div className={styles.searchRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Search</span>
          <input
            className={styles.textInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms"
            aria-label="Search vocabulary"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.mutedText}>
          {studySet.vocabulary.length === 0
            ? "No vocabulary terms yet."
            : "No terms match your search."}
        </p>
      ) : (
        <ul className={styles.vocabList}>
          {filtered.map((item) => {
            const isOpen = Boolean(revealed[item.id]);
            const result = results[item.id] ?? null;
            const converted = isAlreadyFlashcard(item.term);
            const answer = answers[item.id] ?? "";

            return (
              <li key={item.id} className={styles.vocabItem}>
                <h2 className={styles.vocabTerm}>{item.term}</h2>

                {!isOpen && (
                  <form
                    className={styles.vocabAnswerForm}
                    onSubmit={(event) =>
                      handleCheckSubmit(event, item.id, item.definition)
                    }
                  >
                    <textarea
                      className={styles.vocabAnswerInput}
                      value={answer}
                      onChange={(e) => setAnswer(item.id, e.target.value)}
                      placeholder="Type the definition…"
                      rows={2}
                      aria-label={`Definition for ${item.term}`}
                    />
                    <div className={styles.inlineActions}>
                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={!answer.trim()}
                      >
                        Check
                      </button>
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => revealAnswer(item.id)}
                      >
                        Reveal
                      </button>
                    </div>
                  </form>
                )}

                {result === "correct" && (
                  <p className={styles.correctText} role="status">
                    Correct
                  </p>
                )}
                {result === "incorrect" && !isOpen && (
                  <p className={styles.incorrectText} role="status">
                    Not quite — try again or reveal.
                  </p>
                )}

                {isOpen && (
                  <div className={styles.vocabRevealed}>
                    <p className={styles.vocabDefinition}>{item.definition}</p>
                    {item.example ? (
                      <p className={styles.mutedText}>
                        Example: {item.example}
                      </p>
                    ) : null}
                    <div className={styles.inlineActions}>
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => hideAnswer(item.id)}
                      >
                        Hide
                      </button>
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => convertToFlashcard(item.id)}
                        disabled={converted}
                      >
                        {converted ? "Saved as flashcard" : "Save as flashcard"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
