"use client";

import { useMemo, useState } from "react";
import { SubjectIcon } from "../components/SubjectNav";
import type { StudySet } from "./types";
import styles from "./study.module.css";

type DefinitionsViewProps = {
  studySet: StudySet;
  onBack: () => void;
};

export default function DefinitionsView({
  studySet,
  onBack,
}: DefinitionsViewProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return studySet.keyDefinitions;
    return studySet.keyDefinitions.filter((item) => {
      const haystack =
        `${item.term} ${item.definition} ${item.example ?? ""} ${item.whyItMatters ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [search, studySet.keyDefinitions]);

  return (
    <div className={`${styles.workspace} ${styles.readingWidth}`}>
      <button type="button" className={styles.textButton} onClick={onBack}>
        ← Back
      </button>
      <div className={styles.overviewTitleRow}>
        <SubjectIcon subject={studySet.subject} />
        <h1 className={styles.pageTitle}>{studySet.title}</h1>
      </div>
      <p className={styles.mutedText}>
        {studySet.keyDefinitions.length} concept
        {studySet.keyDefinitions.length === 1 ? "" : "s"}
      </p>

      {studySet.keyDefinitions.length > 4 && (
        <div className={styles.searchRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Search</span>
            <input
              className={styles.textInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search concepts"
              aria-label="Search key definitions"
            />
          </label>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className={styles.mutedText}>
          {studySet.keyDefinitions.length === 0
            ? "No key definitions yet."
            : "No concepts match your search."}
        </p>
      ) : (
        <div className={styles.definitionsList}>
          {filtered.map((item) => (
            <article key={item.id} className={styles.definitionItem}>
              <h2 className={styles.conceptHeading}>{item.term}</h2>
              <p className={styles.conceptExplanation}>{item.definition}</p>
              {item.whyItMatters ? (
                <p className={styles.conceptWhy}>
                  <span className={styles.inlineLabel}>Why it matters</span>
                  {item.whyItMatters}
                </p>
              ) : null}
              {item.example ? (
                <p className={styles.conceptExample}>
                  <span className={styles.inlineLabel}>Example</span>
                  {item.example}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
