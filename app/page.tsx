"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Markdown from "./Markdown";
import styles from "./page.module.css";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const EXAMPLE_QUESTIONS = [
  { emoji: "🌍", text: "Why do seasons happen?" },
  { emoji: "🧪", text: "Explain photosynthesis" },
  { emoji: "➗", text: "Help me solve 3x + 7 = 22" },
  { emoji: "🏛️", text: "What caused the Civil War?" },
] as const;

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

type Grade = (typeof GRADES)[number]["value"];
type ExplanationStyle = (typeof EXPLANATION_STYLES)[number]["value"];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [grade, setGrade] = useState<Grade>("8");
  const [explanationStyle, setExplanationStyle] =
    useState<ExplanationStyle>("normal");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasConversation = messages.length > 0;

  useEffect(() => {
    if (!hasConversation) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, hasConversation]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 180);
    el.style.height = `${next}px`;
  }, [input]);

  async function sendMessages(nextMessages: Message[]) {
    setError(null);
    setCanRetry(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          grade,
          explanationStyle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Something went wrong. Please try again."
        );
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";
      setError(message);
      setCanRetry(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    await sendMessages(updatedMessages);
  }

  async function handleRetry() {
    if (isLoading || messages.length === 0) return;
    await sendMessages(messages);
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

  const year = new Date().getFullYear();

  return (
    <div className={styles.page}>
      <div className={styles.bgDecor} aria-hidden="true">
        <div className={styles.glow} />
        <div className={styles.beam} />
        <div className={styles.wave} />
      </div>

      <header className={styles.topHeader}>
        <div className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
              <path
                d="M16 3v4M16 7l-5 4h10l-5-4Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M13 11v10h6V11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M10 21h12M8 25h16M11 21v4M21 21v4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="16" cy="5" r="1.4" fill="currentColor" />
            </svg>
          </span>
          <div>
            <p className={styles.brandName}>Project Lighthouse</p>
            <p className={styles.brandLabel}>AI Study Coach</p>
          </div>
        </div>
      </header>

      <main
        className={`${styles.main} ${hasConversation ? styles.mainActive : ""}`}
      >
        <section
          className={`${styles.hero} ${hasConversation ? styles.heroCompact : ""}`}
          aria-labelledby="hero-heading"
        >
          <h1 id="hero-heading" className={styles.headline}>
            Learn it clearly. Remember it longer.
          </h1>
          <p className={styles.subhead}>
            Project Lighthouse explains difficult school topics step by step,
            using clear examples and guidance matched to your grade level.
          </p>

          <h2 className={styles.promptHeading}>
            What would you like to understand today?
          </h2>

          <form className={styles.composer} onSubmit={handleSubmit}>
            <div className={styles.settingsRow}>
              <label className={styles.settingField} htmlFor="grade-select">
                <span className={styles.settingLabel}>Grade</span>
                <select
                  id="grade-select"
                  className={styles.settingSelect}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as Grade)}
                  disabled={isLoading}
                >
                  {GRADES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label
                className={styles.settingField}
                htmlFor="explanation-select"
              >
                <span className={styles.settingLabel}>Explanation</span>
                <select
                  id="explanation-select"
                  className={styles.settingSelect}
                  value={explanationStyle}
                  onChange={(e) =>
                    setExplanationStyle(e.target.value as ExplanationStyle)
                  }
                  disabled={isLoading}
                >
                  {EXPLANATION_STYLES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label htmlFor="question" className={styles.visuallyHidden}>
              Ask a school question
            </label>
            <div className={styles.composerBox}>
              <textarea
                id="question"
                ref={textareaRef}
                className={styles.input}
                rows={2}
                placeholder="Ask anything about school…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                aria-describedby="disclaimer"
              />
              <button
                type="submit"
                className={styles.sendButton}
                disabled={isLoading || input.trim().length === 0}
                aria-label="Send question"
              >
                Send
              </button>
            </div>
            <p id="disclaimer" className={styles.disclaimer}>
              Project Lighthouse can make mistakes. Check important information.
            </p>
          </form>

          {!hasConversation && (
            <div className={styles.examples}>
              <h3 className={styles.examplesHeading}>Try one of these</h3>
              <div className={styles.exampleGrid} role="list">
                {EXAMPLE_QUESTIONS.map((example) => (
                  <button
                    key={example.text}
                    type="button"
                    className={styles.exampleCard}
                    role="listitem"
                    onClick={() => fillExample(example.text)}
                    disabled={isLoading}
                  >
                    <span className={styles.exampleEmoji} aria-hidden="true">
                      {example.emoji}
                    </span>
                    <span>{example.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {hasConversation && (
          <section
            className={styles.conversation}
            aria-label="Conversation"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`${styles.message} ${
                  message.role === "user"
                    ? styles.messageUser
                    : styles.messageAssistant
                }`}
              >
                <p className={styles.messageLabel}>
                  {message.role === "user" ? "You" : "Project Lighthouse"}
                </p>
                {message.role === "assistant" ? (
                  <div className={styles.markdown}>
                    <Markdown content={message.content} />
                  </div>
                ) : (
                  <p className={styles.userText}>{message.content}</p>
                )}
              </article>
            ))}

            {isLoading && (
              <div
                className={`${styles.message} ${styles.messageAssistant}`}
                role="status"
                aria-live="polite"
              >
                <p className={styles.messageLabel}>Project Lighthouse</p>
                <div className={styles.loading}>
                  <span className={styles.dots} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>Project Lighthouse is thinking…</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </section>
        )}

        {error && (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            {canRetry && (
              <button
                type="button"
                className={styles.retryButton}
                onClick={() => void handleRetry()}
                disabled={isLoading}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerBrand}>
          Project Lighthouse · AI Study Coach
        </p>
        <p className={styles.footerNote}>
          Designed to help students understand, practice, and learn.
        </p>
        <p className={styles.footerYear}>© {year}</p>
      </footer>
    </div>
  );
}
