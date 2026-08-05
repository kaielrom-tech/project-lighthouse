"use client";

import styles from "./AppHeader.module.css";

export type AppArea = "tutor" | "study";

type AppHeaderProps = {
  activeArea: AppArea;
  onNavigate: (area: AppArea) => void;
  children: React.ReactNode;
};

function LighthouseIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" fill="none" aria-hidden="true">
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
  );
}

export default function AppHeader({
  activeArea,
  onNavigate,
  children,
}: AppHeaderProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <LighthouseIcon />
          </span>
          <span className={styles.brandName}>Project Lighthouse</span>
        </div>

        <nav className={styles.nav} aria-label="Main">
          <button
            type="button"
            className={`${styles.navLink} ${
              activeArea === "tutor" ? styles.navLinkActive : ""
            }`}
            aria-current={activeArea === "tutor" ? "page" : undefined}
            onClick={() => onNavigate("tutor")}
          >
            Tutor
          </button>
          <button
            type="button"
            className={`${styles.navLink} ${
              activeArea === "study" ? styles.navLinkActive : ""
            }`}
            aria-current={activeArea === "study" ? "page" : undefined}
            onClick={() => onNavigate("study")}
          >
            Study Tools
          </button>
        </nav>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
