"use client";

import { X } from "lucide-react";
import styles from "./EvaluationModal.module.css";
import type { EvaluationModalLayout } from "./EvaluationModal.types";

interface EvaluationModalHeaderProps {
  layout: EvaluationModalLayout;
  onClose: () => void;
  sessionId?: string;
}

/**
 * Shared modal-style header for both overlay and `/kyai` page layouts.
 * Page mode uses Cancel (`.btn-secondary`); modal mode uses an icon close.
 * AppPageShell already owns the top-bar "Know Your AI" title on `/kyai`.
 */
export function EvaluationModalHeader({ layout, onClose, sessionId }: EvaluationModalHeaderProps) {
  const sessionBadge = sessionId ? (
    <span className={styles.sessionId}>Session: {sessionId}</span>
  ) : null;

  return (
    <div className={styles.modalHeader}>
      <div className={styles.titleContent}>
        <span className={styles.pageEyebrow}>KYAI Playground</span>
        <h2 id="evaluation-modal-title" className={styles.titleText}>
          Know Your AI
        </h2>
        <span className={styles.titleSubtext}>
          Trace, score, and visualize a single agent-team execution.
        </span>
      </div>
      <div className={styles.headerActions}>
        {sessionBadge && <div className={styles.sessionInfo}>{sessionBadge}</div>}
        {layout === "page" ? (
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close evaluation modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

export default EvaluationModalHeader;
