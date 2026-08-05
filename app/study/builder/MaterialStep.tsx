"use client";

import {
  ChangeEvent,
  DragEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { SUBJECT_LABELS } from "../labels";
import { getRelatedTopicExamples } from "../relatedTopicExamples";
import type {
  ExplanationStyle,
  Grade,
  LearningCardOption,
  SourceType,
  Subject,
} from "../types";
import styles from "../study.module.css";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPT_FILE_TYPES = "application/pdf,image/png,image/jpeg,image/webp";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const SOURCES: {
  id: SourceType;
  title: string;
  description: string;
}[] = [
  {
    id: "topic",
    title: "Topic",
    description:
      "Enter a topic such as cellular respiration, the causes of the Civil War, or solving linear equations.",
  },
  {
    id: "notes",
    title: "Notes",
    description:
      "Paste class notes, a study guide, a reading passage, or material from your teacher.",
  },
  {
    id: "learning-card",
    title: "AI Explanation",
    description:
      "Use one of your previous Project Lighthouse learning conversations.",
  },
  {
    id: "file",
    title: "PDF or Image",
    description:
      "Upload a worksheet, study guide, textbook page, screenshot, or class handout.",
  },
];

type MaterialStepProps = {
  sourceType: SourceType | null;
  topic: string;
  topicInstructions: string;
  notes: string;
  selectedCardId: string;
  file: File | null;
  filePreviewUrl: string | null;
  fileNotes: string;
  fileFocus: string;
  fileError: string | null;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
  learningCards: LearningCardOption[];
  onSelectSource: (source: SourceType) => void;
  onTopicChange: (value: string) => void;
  onTopicInstructionsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSelectCard: (card: LearningCardOption) => void;
  onFileSelected: (
    file: File | null,
    previewUrl: string | null,
    error: string | null
  ) => void;
  onFileNotesChange: (value: string) => void;
  onFileFocusChange: (value: string) => void;
  onContinue: () => void;
  onCancel: () => void;
};

export function resolveMimeType(file: File): string | null {
  if (ALLOWED_MIME_TYPES.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canContinue(props: MaterialStepProps): boolean {
  if (!props.sourceType) return false;
  if (props.sourceType === "topic") return props.topic.trim().length >= 2;
  if (props.sourceType === "notes") return props.notes.trim().length >= 20;
  if (props.sourceType === "learning-card")
    return Boolean(props.selectedCardId);
  return Boolean(props.file);
}

export default function MaterialStep(props: MaterialStepProps) {
  const {
    sourceType,
    topic,
    topicInstructions,
    notes,
    selectedCardId,
    file,
    filePreviewUrl,
    fileNotes,
    fileFocus,
    fileError,
    subject,
    grade,
    explanationStyle,
    learningCards,
    onSelectSource,
    onTopicChange,
    onTopicInstructionsChange,
    onNotesChange,
    onSelectCard,
    onFileSelected,
    onFileNotesChange,
    onFileFocusChange,
    onContinue,
    onCancel,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const examples = useMemo(
    () => getRelatedTopicExamples(topic, subject, grade, explanationStyle),
    [topic, subject, grade, explanationStyle]
  );

  const selectedSource = SOURCES.find((source) => source.id === sourceType);

  function handleFile(next: File | null) {
    if (!next) {
      onFileSelected(null, null, null);
      return;
    }
    const mime = resolveMimeType(next);
    if (!mime) {
      onFileSelected(null, null, "Please upload a PDF, PNG, JPG, or WEBP file.");
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      onFileSelected(null, null, "Files must be 8 MB or smaller.");
      return;
    }
    const preview = mime.startsWith("image/")
      ? URL.createObjectURL(next)
      : null;
    onFileSelected(next, preview, null);
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    event.target.value = "";
    handleFile(next);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const next = event.dataTransfer.files?.[0] ?? null;
    handleFile(next);
  }

  return (
    <section className={styles.builderStep}>
      <h1 className={styles.pageTitle}>What are you studying from?</h1>
      <p className={styles.pageLead}>
        Choose the material we should use to create your study set.
      </p>

      <div className={styles.sourceOptionList} role="group" aria-label="Source type">
        {SOURCES.map((source) => {
          const selected = sourceType === source.id;
          return (
            <button
              key={source.id}
              type="button"
              className={`${styles.sourceOption} ${
                selected ? styles.sourceOptionOn : ""
              }`}
              aria-pressed={selected}
              onClick={() => onSelectSource(source.id)}
            >
              <span className={styles.sourceOptionTitle}>{source.title}</span>
              <span className={styles.sourceOptionText}>
                {source.description}
              </span>
            </button>
          );
        })}
      </div>

      {sourceType && selectedSource && (
        <div className={styles.materialPanel}>
          <h2 className={styles.subheading}>{selectedSource.title}</h2>
          <p className={styles.mutedText}>{selectedSource.description}</p>

          {sourceType === "topic" && (
            <div className={styles.materialFields}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Topic</span>
                <input
                  className={styles.textInput}
                  value={topic}
                  onChange={(e) => onTopicChange(e.target.value)}
                  placeholder="e.g. cellular respiration, fractions, the Civil War"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Focus instructions (optional)
                </span>
                <input
                  className={styles.textInput}
                  value={topicInstructions}
                  onChange={(e) => onTopicInstructionsChange(e.target.value)}
                  placeholder="Anything you want emphasized or skipped"
                />
              </label>
              {examples.length > 0 && (
                <div>
                  <p className={styles.fieldLabel}>Try a related topic</p>
                  <div className={styles.topicExamples}>
                    {examples.slice(0, 4).map((example) => (
                      <button
                        key={example.text}
                        type="button"
                        className={styles.exampleChip}
                        onClick={() => onTopicChange(example.text)}
                      >
                        {example.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {sourceType === "notes" && (
            <div className={styles.materialFields}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Your notes</span>
                <textarea
                  className={styles.textarea}
                  rows={10}
                  value={notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Paste class notes, a study guide, or a reading passage here"
                />
              </label>
              <p className={styles.mutedText}>
                Include enough detail for clear flashcards and definitions.
              </p>
            </div>
          )}

          {sourceType === "learning-card" && (
            <div className={styles.materialFields}>
              {learningCards.length === 0 ? (
                <p className={styles.mutedText}>
                  No previous Tutor explanations yet. Ask a question in Tutor
                  first, or choose another source.
                </p>
              ) : (
                <>
                  <p className={styles.mutedText}>
                    Select a learning conversation to turn into study material.
                  </p>
                  <ul className={styles.simpleList}>
                    {learningCards.map((card) => {
                      const selected = selectedCardId === card.id;
                      return (
                        <li key={card.id}>
                          <button
                            type="button"
                            className={`${styles.simpleListButton} ${
                              selected ? styles.simpleListButtonOn : ""
                            }`}
                            aria-pressed={selected}
                            onClick={() => onSelectCard(card)}
                          >
                            <span className={styles.simpleListTitle}>
                              {card.title}
                            </span>
                            <span className={styles.simpleListMeta}>
                              {SUBJECT_LABELS[card.subject]} · Grade{" "}
                              {card.grade}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          )}

          {sourceType === "file" && (
            <div className={styles.materialFields}>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_FILE_TYPES}
                className={styles.fileHidden}
                onChange={onFileInput}
              />
              <div
                className={`${styles.uploadArea} ${
                  isDragging ? styles.uploadAreaDragging : ""
                }`}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                {file ? (
                  <div className={styles.uploadPreview}>
                    {filePreviewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={filePreviewUrl}
                        alt=""
                        className={styles.uploadThumb}
                      />
                    ) : null}
                    <div>
                      <p className={styles.simpleListTitle}>{file.name}</p>
                      <p className={styles.mutedText}>
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.textButton}
                      onClick={() => handleFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <p>
                      Drop a PDF or image here, or choose a file from your
                      device.
                    </p>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose file
                    </button>
                  </>
                )}
              </div>
              {fileError && (
                <p className={styles.errorText} role="alert">
                  {fileError}
                </p>
              )}
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Additional writing (optional)
                </span>
                <textarea
                  className={styles.textarea}
                  rows={5}
                  value={fileNotes}
                  onChange={(e) => onFileNotesChange(e.target.value)}
                  placeholder="Paste or type any notes that go with this file"
                />
              </label>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>
                  Focus instructions (optional)
                </span>
                <input
                  className={styles.textInput}
                  value={fileFocus}
                  onChange={(e) => onFileFocusChange(e.target.value)}
                  placeholder="What should we focus on in this file?"
                />
              </label>
            </div>
          )}
        </div>
      )}

      <div className={styles.stepActions}>
        <button type="button" className={styles.textButton} onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={!canContinue(props)}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </section>
  );
}
