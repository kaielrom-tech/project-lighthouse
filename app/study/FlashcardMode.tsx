"use client";

import { useEffect, useRef, useState } from "react";
import { SubjectIcon } from "../components/SubjectNav";
import type { StudySet } from "./types";
import styles from "./study.module.css";

type FlashcardModeProps = {
  studySet: StudySet;
  onBack: () => void;
  onOpenList: () => void;
};

function shuffleIds(ids: string[]): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = next[i];
    next[i] = next[j];
    next[j] = temp;
  }
  return next;
}

export default function FlashcardMode({
  studySet,
  onBack,
  onOpenList,
}: FlashcardModeProps) {
  const cards = studySet.flashcards;
  const rootRef = useRef<HTMLDivElement>(null);
  const [order, setOrder] = useState<string[]>(() =>
    cards.map((card) => card.id)
  );
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const safeIndex = Math.min(index, Math.max(order.length - 1, 0));
  const currentId = order[safeIndex];
  const card = cards.find((item) => item.id === currentId) ?? cards[0];
  const theme =
    card?.design?.theme ??
    ({
      math: "math-grid",
      reading: "reading-page",
      writing: "writing-notes",
      science: "science-molecule",
      history: "history-timeline",
      general: "general-lighthouse",
    } as const)[studySet.subject];

  function goTo(nextIndex: number) {
    if (order.length === 0) return;
    const clamped = Math.max(0, Math.min(order.length - 1, nextIndex));
    setIndex(clamped);
    setFlipped(false);
    setShowHint(false);
  }

  function handleShuffle() {
    if (cards.length === 0) return;
    setOrder(shuffleIds(cards.map((item) => item.id)));
    setIndex(0);
    setFlipped(false);
    setShowHint(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      const focusedInComponent =
        active === document.body ||
        active === root ||
        (active instanceof Node && root.contains(active));
      if (!focusedInComponent) return;
      if (
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((current) => {
          const next = Math.max(0, current - 1);
          if (next !== current) {
            setFlipped(false);
            setShowHint(false);
          }
          return next;
        });
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((current) => {
          const next = Math.min(order.length - 1, current + 1);
          if (next !== current) {
            setFlipped(false);
            setShowHint(false);
          }
          return next;
        });
        return;
      }
      if (event.key === " " || event.code === "Space" || event.key === "Enter") {
        event.preventDefault();
        setFlipped((value) => !value);
        setShowHint(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [order.length]);

  if (cards.length === 0) {
    return (
      <div className={styles.workspace}>
        <button type="button" className={styles.textButton} onClick={onBack}>
          ← Back
        </button>
        <h1 className={styles.pageTitle}>Flashcards</h1>
        <p className={styles.mutedText}>No flashcards in this study set yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.workspace} ref={rootRef} tabIndex={-1}>
      <div className={styles.flashTopBar}>
        <button type="button" className={styles.textButton} onClick={onBack}>
          ← Back
        </button>
        <p className={styles.flashProgress} aria-live="polite">
          {safeIndex + 1} of {order.length}
        </p>
      </div>

      <div className={styles.overviewTitleRow}>
        <SubjectIcon subject={studySet.subject} />
        <h1 className={styles.pageTitle}>{studySet.title}</h1>
      </div>

      <div className={styles.flashStage}>
        <button
          type="button"
          className={`${styles.bigFlashcard} ${flipped ? styles.flipped : ""}`}
          data-subject={studySet.subject}
          data-theme={theme}
          onClick={() => {
            setFlipped((value) => !value);
            setShowHint(false);
          }}
          aria-label={flipped ? "Show question side" : "Show answer side"}
        >
          <span className={styles.flashSideLabel}>
            {flipped ? "Answer" : "Question"}
          </span>
          {flipped ? (
            <span className={styles.flashAnswerText}>{card.back}</span>
          ) : (
            <span className={styles.flashQuestionText}>{card.front}</span>
          )}
          <span className={styles.flashHintAction}>
            {flipped ? "Click to return" : "Click to reveal"}
          </span>
        </button>

        {!flipped && card.hint ? (
          <div className={styles.flashHintPanel}>
            {!showHint ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setShowHint(true)}
              >
                Show Hint
              </button>
            ) : (
              <>
                <p className={styles.flashHint} role="status">
                  Hint: {card.hint}
                </p>
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => setShowHint(false)}
                >
                  Hide hint
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className={styles.flashControls}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => goTo(safeIndex - 1)}
          disabled={safeIndex === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => goTo(safeIndex + 1)}
          disabled={safeIndex >= order.length - 1}
        >
          Next
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={handleShuffle}
        >
          Shuffle
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onOpenList}
        >
          List View
        </button>
      </div>
    </div>
  );
}
