"use client";

import styles from "./PageHeader.module.css";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  backLabel?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
};

export default function PageHeader({
  title,
  description,
  eyebrow,
  backLabel,
  onBack,
  actions,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.copy}>
        {onBack && backLabel ? (
          <button type="button" className={styles.back} onClick={onBack}>
            {backLabel}
          </button>
        ) : null}
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
