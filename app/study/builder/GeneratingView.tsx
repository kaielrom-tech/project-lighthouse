"use client";

import styles from "../study.module.css";

type GeneratingViewProps = {
  title: string;
  message: string;
  error: string | null;
  onRetry: () => void;
  onBackToReview: () => void;
};

export default function GeneratingView({
  title,
  message,
  error,
  onRetry,
  onBackToReview,
}: GeneratingViewProps) {
  if (error) {
    return (
      <div className={styles.generatingScreen}>
        <h1 className={styles.pageTitle}>{title || "Study set"}</h1>
        <p className={styles.errorText} role="alert">
          {error}
        </p>
        <div className={styles.stepActionsRight}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onBackToReview}
          >
            Back to Review
          </button>
          <button type="button" className={styles.primaryButton} onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.generatingScreen} aria-busy="true">
      <h1 className={styles.pageTitle}>{title || "Creating your study set"}</h1>
      <div className={styles.generatingPulse} aria-hidden="true" />
      <p className={styles.loadingText} role="status">
        {message}
      </p>
    </div>
  );
}
