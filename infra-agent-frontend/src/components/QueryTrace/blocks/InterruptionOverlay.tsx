"use client";

import { useCallback, useState } from "react";
import PulseDot from "../skeletons/PulseDot";
import { useInterruption, usePhase } from "../blockStream/useBlockStream";
import { normalizeToolName } from "@/utils/normalizeToolName";
import styles from "./phaseHeader.module.css";

/**
 * Overlay shown while the phase is `interruption_awaited`.
 *
 * Reads the interruption payload from the block store and surfaces
 * the tool name, reason, and arguments. The approve/reject callbacks
 * fire the standard SSE-companion REST endpoints (see
 * `flowStreamApi.resumeFlow`); the SSE stream then resumes with the
 * decision event and the overlay unmounts when the phase transitions.
 */
interface InterruptionOverlayProps {
  onApprove?: () => void;
  onReject?: () => void;
}

function InterruptionOverlay({ onApprove, onReject }: InterruptionOverlayProps) {
  const phase = usePhase();
  const interruption = useInterruption();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(async () => {
    if (!onApprove || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onApprove();
    } catch {
      setError("Failed to approve. Retrying may help.");
    } finally {
      setIsSubmitting(false);
    }
  }, [onApprove, isSubmitting]);

  const handleReject = useCallback(async () => {
    if (!onReject || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onReject();
    } catch {
      setError("Failed to reject. Retrying may help.");
    } finally {
      setIsSubmitting(false);
    }
  }, [onReject, isSubmitting]);

  if (phase !== "interruption_awaited" || !interruption) {
    return null;
  }

  if (interruption.tool_name === "submit_for_approval") {
    return null;
  }

  return (
    // `open` (not `showModal()`) keeps this in normal document flow so the
    // existing `position: absolute; inset: 0` overlay CSS (scoped to the
    // trace panel, not the whole viewport) keeps working — a real modal
    // dialog renders in the browser's top layer, centered on the viewport,
    // which would break that contained-overlay layout. `<dialog>` still
    // gives the correct implicit `role="dialog"` without a JS/effect call.
    <dialog
      open
      className={styles.interruptionOverlay}
      aria-modal="true"
      aria-labelledby="interruption-title"
    >
      <div className={styles.interruptionDialog}>
        <div id="interruption-title" className={styles.interruptionHeader}>
          <PulseDot color="var(--warning-500)" ariaLabel="Awaiting confirmation" />
          <span>Confirmation required</span>
        </div>
        <div className={styles.interruptionBody}>
          The agent is about to run{" "}
          <span className={styles.interruptionToolName} title={interruption.tool_name}>
            {normalizeToolName(interruption.tool_name)}
          </span>
          .
        </div>
        {interruption.reason && (
          <div className={styles.interruptionBody}>{interruption.reason}</div>
        )}
        {interruption.arguments && Object.keys(interruption.arguments).length > 0 && (
          <pre className={styles.interruptionArgs}>
            {JSON.stringify(interruption.arguments, null, 2)}
          </pre>
        )}
        {error && (
          <div className={[styles.interruptionBody, styles.interruptionError].join(" ")}>
            {error}
          </div>
        )}
        {(onApprove || onReject) && (
          <div className={styles.interruptionActions}>
            {onReject && (
              <button
                type="button"
                className={[styles.interruptionBtn, styles.interruptionBtnDanger].join(" ")}
                onClick={handleReject}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                className={[styles.interruptionBtn, styles.interruptionBtnPrimary].join(" ")}
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Approving..." : "Approve"}
              </button>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}

export default InterruptionOverlay;
