"use client";

import type { Subject } from "../study/types";
import styles from "./SubjectNav.module.css";

export type SubjectFilter = "all" | Subject;

const ITEMS: { value: SubjectFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "math", label: "Math" },
  { value: "reading", label: "Reading" },
  { value: "writing", label: "Writing" },
  { value: "science", label: "Science" },
  { value: "history", label: "History" },
  { value: "general", label: "General" },
];

type SubjectNavProps = {
  value: SubjectFilter;
  onChange: (value: SubjectFilter) => void;
  /** When false, hides All (for choosing a real subject only). */
  includeAll?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
};

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 20 16"
      width="16"
      height="13"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.5 2.75A1.75 1.75 0 0 1 3.25 1h4.1c.4 0 .78.17 1.05.46l.9.97c.14.15.33.23.53.23h5.92A1.75 1.75 0 0 1 17.5 4.4v8.85A1.75 1.75 0 0 1 15.75 15H3.25A1.75 1.75 0 0 1 1.5 13.25V2.75Z"
        fill="currentColor"
        opacity="0.92"
      />
    </svg>
  );
}

export function SubjectIcon({
  subject,
  className,
}: {
  subject: Subject | "all";
  className?: string;
}) {
  return (
    <span
      className={`${styles.icon} ${className ?? ""}`}
      data-subject={subject}
      aria-hidden="true"
    >
      <FolderIcon />
    </span>
  );
}

export default function SubjectNav({
  value,
  onChange,
  includeAll = true,
  disabled = false,
  ariaLabel = "Subjects",
}: SubjectNavProps) {
  const items = includeAll
    ? ITEMS
    : ITEMS.filter((item) => item.value !== "all");

  return (
    <nav className={styles.nav} aria-label={ariaLabel}>
      <div className={styles.row} role="group">
        {items.map((item) => {
          const pressed = value === item.value;
          return (
            <button
              key={item.value}
              type="button"
              className={`${styles.button} ${pressed ? styles.buttonActive : ""}`}
              data-subject={item.value}
              aria-pressed={pressed}
              disabled={disabled}
              onClick={() => onChange(item.value)}
            >
              <SubjectIcon subject={item.value} />
              <span className={styles.label}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
