"use client";

import { useMemo, useState } from "react";
import type { StudySet } from "./types";
import styles from "./study.module.css";

type FlashcardListProps = {
  studySet: StudySet;
  onBack: () => void;
};

export default function FlashcardList({
  studySet,
  onBack,
}: FlashcardListProps) {
  const [search, setSearch] = useState("");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hintOpen, setHintOpen] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return studySet.flashcards;
    return studySet.flashcards.filter((card) => {
      const front = card.front.toLowerCase();
      const back = card.back.toLowerCase();
      const hint = (card.hint ?? "").toLowerCase();
      return (
        front.includes(query) || back.includes(query) || hint.includes(query)
      );
    });
  }, [search, studySet.flashcards]);

  function toggleReveal(id: string) {
    setRevealed((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    setHintOpen((prev) => ({ ...prev, [id]: false }));
  }

  function toggleHint(id: string) {
    setHintOpen((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.topBar}>
        <button type="button" className={styles.textButton} onClick={onBack}>
          ← Back to Flashcards
        </button>
      </div>

      <h1 className={styles.pageTitle}>Flashcard List</h1>
      <p className={styles.mutedText}>
        {studySet.flashcards.length} card
        {studySet.flashcards.length === 1 ? "" : "s"}
      </p>

      <div className={styles.searchRow}>
        <label className={styles.field}>
          <span className={styles.mutedText}>Search cards</span>
          <input
            className={styles.textInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search front or back"
            aria-label="Search flashcards"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyPanel}>
          <p>
            {studySet.flashcards.length === 0
              ? "No flashcards in this study set yet."
              : "No cards match your search."}
          </p>
        </div>
      ) : (
        <ul>
          {filtered.map((card) => {
            const isOpen = Boolean(revealed[card.id]);
            const hintShown = Boolean(hintOpen[card.id]);
            return (
              <li key={card.id} className={styles.termRow}>
                <strong>{card.front}</strong>
                <div className={styles.inlineActions}>
                  {!isOpen && card.hint ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => toggleHint(card.id)}
                    >
                      {hintShown ? "Hide Hint" : "Show Hint"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => toggleReveal(card.id)}
                  >
                    {isOpen ? "Hide Answer" : "Reveal Answer"}
                  </button>
                </div>
                {!isOpen && hintShown && card.hint ? (
                  <p className={styles.flashHint} role="status">
                    <strong>Hint:</strong> {card.hint}
                  </p>
                ) : null}
                {isOpen ? (
                  <div>
                    <p>{card.back}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
