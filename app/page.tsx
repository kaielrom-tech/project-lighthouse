"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import AppHeader from "./components/AppHeader";
import type { AppArea } from "./components/AppHeader";
import SubjectNav from "./components/SubjectNav";
import { SubjectIcon } from "./components/SubjectNav";
import type { SubjectFilter } from "./components/SubjectNav";
import { getExampleQuestions } from "./exampleQuestions";
import Markdown from "./Markdown";
import StudyTools from "./study/StudyTools";
import type { LearningCardOption, StudyDraft } from "./study/types";
import styles from "./page.module.css";

type Grade =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12";

type ExplanationStyle = "simple" | "normal" | "advanced";

type Subject =
  | "math"
  | "reading"
  | "writing"
  | "science"
  | "history"
  | "general";

type TurnStatus = "loading" | "ready" | "error";

type LearningTurn = {
  id: string;
  question: string;
  answer: string | null;
  followUps: string[];
  status: TurnStatus;
  error: string | null;
};

type CardAttachment = {
  file: File;
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string | null;
};

type LearningCard = {
  id: string;
  subject: Subject;
  grade: Grade;
  explanationStyle: ExplanationStyle;
  turns: LearningTurn[];
  attachment: CardAttachment | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ACCEPT_FILE_TYPES = "application/pdf,image/png,image/jpeg,image/webp";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const DEFAULT_FILE_PROMPT =
  "Please explain the important information in this file.";

const GRADES = [
  { value: "1", label: "Grade 1" },
  { value: "2", label: "Grade 2" },
  { value: "3", label: "Grade 3" },
  { value: "4", label: "Grade 4" },
  { value: "5", label: "Grade 5" },
  { value: "6", label: "Grade 6" },
  { value: "7", label: "Grade 7" },
  { value: "8", label: "Grade 8" },
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
] as const;

const EXPLANATION_STYLES = [
  { value: "simple", label: "Simple" },
  { value: "normal", label: "Normal" },
  { value: "advanced", label: "Advanced" },
] as const;

const SUBJECTS = [
  { value: "math", label: "Math" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "general", label: "General" },
] as const;

const SUBJECT_LABELS: Record<Subject, string> = Object.fromEntries(
  SUBJECTS.map((s) => [s.value, s.label])
) as Record<Subject, string>;

const GRADE_LABELS: Record<string, string> = Object.fromEntries(
  GRADES.map((g) => [g.value, g.label])
);

const STYLE_LABELS: Record<ExplanationStyle, string> = {
  simple: "Simple",
  normal: "Normal",
  advanced: "Advanced",
};

function createCardId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function resolveAllowedMimeType(file: File): string | null {
  if (ALLOWED_MIME_TYPES.has(file.type)) {
    return file.type;
  }

  // Some Windows browsers leave file.type empty; fall back to the extension.
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  return null;
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8 13h8M8 17h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  const [cards, setCards] = useState<LearningCard[]>([]);
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [grade, setGrade] = useState<Grade>("8");
  const [explanationStyle, setExplanationStyle] =
    useState<ExplanationStyle>("normal");
  const [selectedSubject, setSelectedSubject] = useState<Subject>("general");
  const [activeSubjectFilter, setActiveSubjectFilter] =
    useState<SubjectFilter>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeArea, setActiveArea] = useState<AppArea>("tutor");
  const [studyDraft, setStudyDraft] = useState<StudyDraft>(null);
  const [pendingAttachment, setPendingAttachment] =
    useState<CardAttachment | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const latestTurnRef = useRef<HTMLDivElement | null>(null);
  const pendingPreviewUrlRef = useRef<string | null>(null);
  const cardsRef = useRef<LearningCard[]>([]);
  const dragDepthRef = useRef(0);
  const focusTimerRef = useRef<number | null>(null);
  const hasCards = cards.length > 0;

  cardsRef.current = cards;

  const visibleCards =
    activeSubjectFilter === "all"
      ? cards
      : cards.filter((card) => card.subject === activeSubjectFilter);

  const exampleQuestions = getExampleQuestions(
    selectedSubject,
    grade,
    explanationStyle
  ).slice(0, 4);

  const showExamples = !hasCards && activeSubjectFilter !== "all";
  const emptyFilterMessage =
    activeSubjectFilter === "all"
      ? "No questions yet."
      : `No ${SUBJECT_LABELS[activeSubjectFilter].toLowerCase()} questions yet.`;

  function prefersReducedMotion() {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function scrollLatestTurnIntoView() {
    latestTurnRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }

  useEffect(() => {
    if (!openQuestionId) return;
    const frame = requestAnimationFrame(() => {
      const el = cardRefs.current[openQuestionId];
      if (!el) return;
      el.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [openQuestionId]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "64px";
    const next = Math.max(64, Math.min(el.scrollHeight, 180));
    el.style.height = `${next}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrlRef.current) {
        URL.revokeObjectURL(pendingPreviewUrlRef.current);
      }
      for (const card of cardsRef.current) {
        if (card.attachment?.previewUrl) {
          URL.revokeObjectURL(card.attachment.previewUrl);
        }
      }
      if (focusTimerRef.current != null) {
        window.clearTimeout(focusTimerRef.current);
      }
    };
  }, []);

  // Keep the browser from navigating away when a PDF is dropped on the page.
  useEffect(() => {
    function preventBrowserFileOpen(event: globalThis.DragEvent) {
      if (!event.dataTransfer?.types?.includes("Files")) return;
      event.preventDefault();
    }

    window.addEventListener("dragover", preventBrowserFileOpen);
    window.addEventListener("drop", preventBrowserFileOpen);
    return () => {
      window.removeEventListener("dragover", preventBrowserFileOpen);
      window.removeEventListener("drop", preventBrowserFileOpen);
    };
  }, []);

  function clearPendingAttachment() {
    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
      pendingPreviewUrlRef.current = null;
    }
    pendingFileRef.current = null;
    setPendingAttachment(null);
    setIsDragging(false);
    dragDepthRef.current = 0;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function focusQuestionInput() {
    if (focusTimerRef.current != null) {
      window.clearTimeout(focusTimerRef.current);
    }

    // File dialogs often restore focus to Attach after they close.
    focusTimerRef.current = window.setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const end = el.value.length;
      el.setSelectionRange(end, end);
    }, 120);
  }

  function selectAttachment(file: File) {
    const mimeType = resolveAllowedMimeType(file);

    if (!mimeType) {
      clearPendingAttachment();
      setAttachError("Please upload a PDF, PNG, JPG, or WEBP file.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      clearPendingAttachment();
      setAttachError("Files must be 8 MB or smaller.");
      return;
    }

    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
      pendingPreviewUrlRef.current = null;
    }

    const previewUrl = mimeType.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;
    pendingPreviewUrlRef.current = previewUrl;
    pendingFileRef.current = file;

    setIsDragging(false);
    dragDepthRef.current = 0;
    setAttachError(null);
    setPendingAttachment({
      file,
      name: file.name || "attachment",
      mimeType,
      size: file.size,
      previewUrl,
    });

    focusQuestionInput();
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    selectAttachment(file);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    selectAttachment(file);
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (!file) continue;
      event.preventDefault();
      selectAttachment(file);
      return;
    }
  }

  function updateTurn(
    cardId: string,
    turnId: string,
    patch: Partial<LearningTurn>
  ) {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          turns: card.turns.map((turn) =>
            turn.id === turnId ? { ...turn, ...patch } : turn
          ),
        };
      })
    );
  }

  function buildMessagesForTurn(
    card: LearningCard,
    targetTurnId: string
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    for (const turn of card.turns) {
      messages.push({ role: "user", content: turn.question });

      if (turn.id === targetTurnId) {
        break;
      }

      if (turn.answer) {
        messages.push({ role: "assistant", content: turn.answer });
      }
    }

    return messages;
  }

  function handleSubjectNavChange(value: SubjectFilter) {
    if (value === "all") {
      setActiveSubjectFilter("all");
      return;
    }
    setSelectedSubject(value);
    setActiveSubjectFilter(value);
  }

  async function fetchTurnAnswer(card: LearningCard, turnId: string) {
    updateTurn(card.id, turnId, {
      status: "loading",
      error: null,
      followUps: [],
    });

    try {
      const messages = buildMessagesForTurn(card, turnId);
      let response: Response;

      if (card.attachment) {
        const formData = new FormData();
        formData.append("messages", JSON.stringify(messages));
        formData.append("grade", card.grade);
        formData.append("explanationStyle", card.explanationStyle);
        formData.append("subject", card.subject);
        formData.append(
          "attachment",
          card.attachment.file,
          card.attachment.name
        );
        formData.append("attachmentFilename", card.attachment.name);
        formData.append("attachmentMimeType", card.attachment.mimeType);

        response = await fetch("/api/chat", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            grade: card.grade,
            explanationStyle: card.explanationStyle,
            subject: card.subject,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Something went wrong. Please try again."
        );
      }

      const followUps = Array.isArray(data.followUps)
        ? data.followUps.filter(
            (item: unknown): item is string =>
              typeof item === "string" && item.trim().length > 0
          )
        : [];

      updateTurn(card.id, turnId, {
        answer: data.reply,
        followUps: followUps.slice(0, 3),
        status: "ready",
        error: null,
      });

      requestAnimationFrame(() => {
        scrollLatestTurnIntoView();
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      updateTurn(card.id, turnId, {
        status: "error",
        error: message,
      });
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmed = input.trim();
    if (isSubmitting) return;
    if (!trimmed && !pendingAttachment) return;

    const questionText = trimmed || DEFAULT_FILE_PROMPT;
    const turnId = createCardId();
    const cardId = createCardId();
    const attachmentForCard = pendingAttachment
      ? {
          ...pendingAttachment,
          file: pendingFileRef.current ?? pendingAttachment.file,
        }
      : null;

    const firstTurn: LearningTurn = {
      id: turnId,
      question: questionText,
      answer: null,
      followUps: [],
      status: "loading",
      error: null,
    };

    const newCard: LearningCard = {
      id: cardId,
      subject: selectedSubject,
      grade,
      explanationStyle,
      turns: [firstTurn],
      attachment: attachmentForCard,
    };

    // Transfer preview URL ownership to the card; do not revoke here.
    pendingPreviewUrlRef.current = null;
    pendingFileRef.current = null;
    setPendingAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setCards((prev) => [...prev, newCard]);
    setOpenQuestionId(cardId);
    setInput("");
    setAttachError(null);
    setIsSubmitting(true);

    await fetchTurnAnswer(newCard, turnId);
    setIsSubmitting(false);
  }

  async function handleRetry(card: LearningCard, turn: LearningTurn) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setOpenQuestionId(card.id);
    await fetchTurnAnswer(card, turn.id);
    setIsSubmitting(false);
  }

  async function handleFollowUp(card: LearningCard, question: string) {
    if (isSubmitting) return;

    const turnId = createCardId();
    const nextTurn: LearningTurn = {
      id: turnId,
      question,
      answer: null,
      followUps: [],
      status: "loading",
      error: null,
    };

    const updatedCard: LearningCard = {
      ...card,
      turns: [...card.turns, nextTurn],
    };

    setCards((prev) =>
      prev.map((item) => (item.id === card.id ? updatedCard : item))
    );
    setOpenQuestionId(card.id);
    setIsSubmitting(true);

    requestAnimationFrame(() => {
      scrollLatestTurnIntoView();
    });

    await fetchTurnAnswer(updatedCard, turnId);
    setIsSubmitting(false);
  }

  function toggleCard(cardId: string) {
    setOpenQuestionId((current) => (current === cardId ? null : cardId));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  function fillExample(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  const studyLearningCards: LearningCardOption[] = cards.flatMap((card) => {
    const readyTurns = card.turns.filter(
      (turn) => turn.status === "ready" && turn.answer
    );
    if (readyTurns.length === 0) return [];

    const sourceText = readyTurns
      .map(
        (turn) =>
          `Student question:\n${turn.question}\n\nTutor answer:\n${turn.answer}`
      )
      .join("\n\n---\n\n");

    const latestAnswer = readyTurns[readyTurns.length - 1]?.answer ?? "";
    const answerPreview =
      latestAnswer.replace(/\s+/g, " ").trim().slice(0, 140) +
      (latestAnswer.trim().length > 140 ? "…" : "");

    return [
      {
        id: card.id,
        title: card.turns[0]?.question ?? "Learning card",
        subject: card.subject,
        grade: card.grade,
        explanationStyle: card.explanationStyle,
        sourceText,
        answerPreview,
      },
    ];
  });

  function createStudySetFromCard(card: LearningCard) {
    const option = studyLearningCards.find((item) => item.id === card.id);
    if (!option) return;

    setStudyDraft({
      sourceType: "learning-card",
      sourceText: option.sourceText,
      sourceLabel: `Learning card: ${option.title}`,
      subject: card.subject,
      grade: card.grade,
      explanationStyle: card.explanationStyle,
      selectedCardId: card.id,
    });
    setActiveArea("study");
  }

  return (
    <AppHeader activeArea={activeArea} onNavigate={setActiveArea}>
      {activeArea === "study" ? (
        <StudyTools
          defaultSubject={selectedSubject}
          defaultGrade={grade}
          defaultExplanationStyle={explanationStyle}
          subjectFilter={activeSubjectFilter}
          onSubjectFilterChange={handleSubjectNavChange}
          learningCards={studyLearningCards}
          draft={studyDraft}
          onDraftConsumed={() => setStudyDraft(null)}
        />
      ) : (
        <div className={styles.tutorPage}>
          <section
            className={`${styles.hero} ${hasCards ? styles.heroCompact : ""}`}
            aria-labelledby="hero-heading"
          >
            <h1 id="hero-heading" className={styles.headline}>
              Understand what you&apos;re learning.
            </h1>
            {!hasCards && (
              <p className={styles.subhead}>
                Ask a question or upload your material for a clear explanation
                matched to your grade.
              </p>
            )}
          </section>

          <SubjectNav
            value={activeSubjectFilter}
            onChange={handleSubjectNavChange}
            disabled={isSubmitting}
          />

          <div
            className={styles.settingsRow}
            role="group"
            aria-label="Learning settings"
          >
            <label className={styles.settingField} htmlFor="grade-select">
              <span className={styles.settingLabel}>Grade</span>
              <select
                id="grade-select"
                className={styles.settingSelect}
                value={grade}
                onChange={(e) => setGrade(e.target.value as Grade)}
                disabled={isSubmitting}
              >
                {GRADES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.settingField} htmlFor="explanation-select">
              <span className={styles.settingLabel}>Explanation</span>
              <select
                id="explanation-select"
                className={styles.settingSelect}
                value={explanationStyle}
                onChange={(e) =>
                  setExplanationStyle(e.target.value as ExplanationStyle)
                }
                disabled={isSubmitting}
              >
                {EXPLANATION_STYLES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <form className={styles.composer} onSubmit={handleSubmit}>
            <p className={styles.askingIn} data-subject={selectedSubject}>
              <SubjectIcon subject={selectedSubject} />
              <span>
                Asking in <strong>{SUBJECT_LABELS[selectedSubject]}</strong>
              </span>
            </p>

            <label htmlFor="question" className={styles.visuallyHidden}>
              Ask a school question
            </label>
            <input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              className={styles.fileInputHidden}
              accept={ACCEPT_FILE_TYPES}
              onChange={handleFileInputChange}
              tabIndex={-1}
            />
            <div
              className={`${styles.composerBox} ${
                isDragging ? styles.composerBoxDragging : ""
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <p className={styles.dropHint} aria-live="polite">
                  Drop your file here
                </p>
              )}
              {pendingAttachment && (
                <div className={styles.attachmentPreview}>
                  {pendingAttachment.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingAttachment.previewUrl}
                      alt=""
                      className={styles.attachmentThumb}
                    />
                  ) : (
                    <span
                      className={styles.attachmentDocIcon}
                      aria-hidden="true"
                    >
                      <DocumentIcon />
                    </span>
                  )}
                  <div className={styles.attachmentMeta}>
                    <span className={styles.attachmentName}>
                      {pendingAttachment.name}
                    </span>
                    <span className={styles.attachmentSize}>
                      {formatFileSize(pendingAttachment.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.attachmentRemove}
                    onClick={() => {
                      clearPendingAttachment();
                      setAttachError(null);
                      focusQuestionInput();
                    }}
                    aria-label="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}
              <textarea
                id="question"
                ref={textareaRef}
                className={styles.input}
                rows={2}
                placeholder={
                  pendingAttachment
                    ? "Ask a question about this file…"
                    : "Ask anything about school…"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                aria-describedby="disclaimer"
              />
              <div className={styles.composerActions}>
                <button
                  type="button"
                  className={styles.attachButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  aria-label="Attach a PDF or image"
                  title="Attach a PDF or image"
                >
                  <PaperclipIcon className={styles.attachIcon} />
                  Attach
                </button>
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={
                    isSubmitting || (!input.trim() && !pendingAttachment)
                  }
                  aria-label="Send question"
                >
                  Send
                </button>
              </div>
            </div>

            {attachError && (
              <p className={styles.attachError} role="alert">
                {attachError}
              </p>
            )}

            <p id="disclaimer" className={styles.disclaimer}>
              Project Lighthouse can make mistakes. Check important information.
            </p>
          </form>

          {showExamples && (
            <div className={styles.examples}>
              <h2 className={styles.sectionHeading}>Try a question</h2>
              <p className={styles.examplesSummary}>
                {SUBJECT_LABELS[selectedSubject]} · {GRADE_LABELS[grade]} ·{" "}
                {STYLE_LABELS[explanationStyle]}
              </p>
              <div className={styles.exampleGrid} role="list">
                {exampleQuestions.map((example) => (
                  <button
                    key={example.text}
                    type="button"
                    className={styles.exampleButton}
                    role="listitem"
                    onClick={() => fillExample(example.text)}
                    disabled={isSubmitting}
                  >
                    {example.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasCards && (
            <section
              className={styles.history}
              aria-label="Previous questions"
            >
              <h2 className={styles.sectionHeading}>Previous questions</h2>
              {visibleCards.length === 0 ? (
                <p className={styles.filterEmpty} role="status">
                  {emptyFilterMessage}
                </p>
              ) : (
                <div className={styles.cardList}>
                  {[...visibleCards].reverse().map((card) => {
                    const isOpen = openQuestionId === card.id;
                    const panelId = `card-panel-${card.id}`;
                    const headerId = `card-header-${card.id}`;
                    const titleQuestion =
                      card.turns[0]?.question ?? "Learning question";
                    const latestTurn = card.turns[card.turns.length - 1];

                    return (
                      <article
                        key={card.id}
                        ref={(el) => {
                          cardRefs.current[card.id] = el;
                        }}
                        className={styles.session}
                      >
                        <h3 className={styles.sessionHeading}>
                          <button
                            type="button"
                            id={headerId}
                            className={styles.sessionToggle}
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => toggleCard(card.id)}
                          >
                            <SubjectIcon subject={card.subject} />
                            <span className={styles.sessionQuestion}>
                              {titleQuestion}
                            </span>
                            <span className={styles.sessionMeta}>
                              {GRADE_LABELS[card.grade] ??
                                `Grade ${card.grade}`}{" "}
                              · {STYLE_LABELS[card.explanationStyle]}
                            </span>
                            <span
                              className={`${styles.chevron} ${
                                isOpen ? styles.chevronOpen : ""
                              }`}
                              aria-hidden="true"
                            >
                              ▾
                            </span>
                          </button>
                        </h3>

                      {isOpen && (
                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={headerId}
                          className={styles.sessionPanel}
                        >
                          {card.turns.some(
                            (turn) => turn.status === "ready" && turn.answer
                          ) && (
                            <button
                              type="button"
                              className={styles.textLink}
                              onClick={() => createStudySetFromCard(card)}
                            >
                              Create study set
                            </button>
                          )}

                          <div className={styles.turnList}>
                            {card.turns.map((turn, turnIndex) => {
                              const isLatestTurn = turn.id === latestTurn?.id;
                              const showFollowUps =
                                isLatestTurn &&
                                turn.status === "ready" &&
                                turn.followUps.length > 0;

                              return (
                                <div
                                  key={turn.id}
                                  className={styles.turn}
                                  ref={
                                    isLatestTurn ? latestTurnRef : undefined
                                  }
                                >
                                  {turnIndex > 0 && (
                                    <div
                                      className={styles.turnDivider}
                                      aria-hidden="true"
                                    />
                                  )}

                                  {turnIndex === 0 && card.attachment && (
                                    <div className={styles.cardAttachment}>
                                      {card.attachment.previewUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={card.attachment.previewUrl}
                                          alt=""
                                          className={styles.attachmentThumb}
                                        />
                                      ) : (
                                        <span
                                          className={styles.attachmentDocIcon}
                                          aria-hidden="true"
                                        >
                                          <DocumentIcon />
                                        </span>
                                      )}
                                      <div className={styles.attachmentMeta}>
                                        <span className={styles.attachmentName}>
                                          {card.attachment.name}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {turnIndex > 0 && (
                                    <p className={styles.turnQuestion}>
                                      {turn.question}
                                    </p>
                                  )}

                                  {turn.status === "loading" && (
                                    <div
                                      className={styles.loading}
                                      role="status"
                                    >
                                      <span>
                                        {card.attachment
                                          ? "Reading your file…"
                                          : "Thinking…"}
                                      </span>
                                    </div>
                                  )}

                                  {turn.status === "error" && turn.error && (
                                    <div
                                      className={styles.error}
                                      role="alert"
                                    >
                                      <p>{turn.error}</p>
                                      <button
                                        type="button"
                                        className={styles.retryButton}
                                        onClick={() =>
                                          void handleRetry(card, turn)
                                        }
                                        disabled={isSubmitting}
                                      >
                                        Retry
                                      </button>
                                    </div>
                                  )}

                                  {turn.status === "ready" && turn.answer && (
                                    <div className={styles.markdown}>
                                      <Markdown content={turn.answer} />
                                    </div>
                                  )}

                                  {showFollowUps && (
                                    <div className={styles.followUps}>
                                      <p className={styles.followUpsHeading}>
                                        Continue learning
                                      </p>
                                      <div className={styles.followUpList}>
                                        {turn.followUps
                                          .slice(0, 3)
                                          .map((followUp) => (
                                            <button
                                              key={followUp}
                                              type="button"
                                              className={styles.followUpButton}
                                              onClick={() =>
                                                void handleFollowUp(
                                                  card,
                                                  followUp
                                                )
                                              }
                                              disabled={isSubmitting}
                                            >
                                              {followUp}
                                            </button>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </AppHeader>
  );
}
