"use client";

import { X } from "lucide-react";
import { PageHero } from "@/components/PageHero/PageHero";
import styles from "./EvaluationModal.module.css";
import type { EvaluationModalLayout } from "./EvaluationModal.types";

interface EvaluationModalHeaderProps {
  layout: EvaluationModalLayout;
  onClose: () => void;
  sessionId?: string;
}

/** `layout="modal"` renders the overlay card's header (title + close
 * button); `layout="page"` renders the full-page hero variant used by the
 * `/kyai` route bridges — same content, no close affordance, a "Back" link
 * instead. */
export function EvaluationModalHeader({ layout, onClose, sessionId }: EvaluationModalHeaderProps) {
  const sessionBadge = sessionId ? (
    <span className={styles.sessionId}>Session: {sessionId}</span>
  ) : null;

  if (layout === "page") {
    return (
      <PageHero
        eyebrow="KYAI Playground"
        title="Know Your AI"
        subtitle="Trace, score, and visualize a single agent-team execution."
        onBack={onClose}
        trailing={sessionBadge && <div className={styles.pageSessionBadge}>{sessionBadge}</div>}
      />
    );
  }

  return (
    <div className={styles.modalHeader}>
      <div className={styles.modalTitle}>
        <div className={styles.titleContent}>
          <span className={styles.pageEyebrow}>KYAI Playground</span>
          <h2 id="evaluation-modal-title" className={styles.titleText}>
            Know Your AI
          </h2>
          <span className={styles.titleSubtext}>
            Trace, score, and visualize a single agent-team execution.
          </span>
        </div>
      </div>
      <div className={styles.headerActions}>
        {sessionBadge && <div className={styles.sessionInfo}>{sessionBadge}</div>}
        <button
          type="button"
          onClick={onClose}
          className={styles.closeButton}
          aria-label="Close evaluation modal"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default EvaluationModalHeader;
