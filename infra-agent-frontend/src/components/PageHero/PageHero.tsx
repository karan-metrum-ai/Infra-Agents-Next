"use client";

import { ChevronLeft } from "lucide-react";
import styles from "./PageHero.module.css";
import type { PageHeroProps } from "./PageHero.types";

/**
 * Shared eyebrow/title/subtitle + top bar (back button, optional trailing
 * slot) used by every full-page (non-modal) feature entry screen -- e.g.
 * `/sandbox/new`, `/kyai`. Consolidates what used to be near-identical
 * `.pageHero`/`.pageEyebrow`/`.titleText`/`.titleSubtext` rules duplicated
 * (with drift) in `SandboxConfigForm.module.css` and
 * `EvaluationModal.module.css`.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  onBack,
  backLabel = "Back",
  trailing,
}: PageHeroProps) {
  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backButton} onClick={onBack}>
          <ChevronLeft size={14} aria-hidden="true" />
          {backLabel}
        </button>
        {trailing}
      </div>
      <div className={styles.hero}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </header>
  );
}

export default PageHero;
