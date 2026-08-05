"use client";

import styles from "./EmptyState.module.css";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  note?: string;
};

function EmptyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M8 7h8M8 12h8M8 17h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="3.5"
        width="16"
        height="17"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export default function EmptyState({
  title,
  description,
  action,
  note,
}: EmptyStateProps) {
  return (
    <div className={styles.panel}>
      <span className={styles.icon}>
        <EmptyIcon />
      </span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
      {note ? <p className={styles.note}>{note}</p> : null}
    </div>
  );
}
