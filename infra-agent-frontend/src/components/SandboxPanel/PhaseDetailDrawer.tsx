"use client";

/**
 * PhaseDetailDrawer -- side panel showing all data for a single
 * phase. Phase `detail` payload shapes vary per phase, so the
 * drawer renders them generically as a key/value table. Phase
 * metadata (status, timing, error) lives in a fixed-shape header
 * above the generic table.
 *
 * Adaptation notes:
 *  - The source used an ad hoc `document.addEventListener("keydown", ...)`
 *    effect for Escape-to-close and had no focus trap / focus restoration.
 *    This is replaced with the real `useDialogFocusTrap` hook (already
 *    established by `SandboxRunHistoryPanel`/`NodeDetailsModal`), which
 *    covers Escape-to-close, Tab-cycling, initial focus, and focus
 *    restoration on close -- all with zero direct `useEffect` calls.
 *  - `role="dialog"`/`aria-modal="true"`/`tabIndex={-1}` were added to the
 *    `<aside>` (the source only had `role="dialog"` with no modal/focus
 *    semantics).
 *  - The caller (`PipelineTimeline`) mounts this with `key={openPhase ??
 *    "none"}`, so switching directly between two open phases forces a
 *    clean remount (fresh focus-trap init) instead of mutating props on a
 *    still-mounted dialog.
 */

import { Fragment, type ReactNode } from "react";
import { AlertCircle, CheckCircle, Circle, Loader2, MinusCircle, X, XCircle } from "lucide-react";

import {
  PHASE_LABELS,
  type PhaseStatus,
  type SandboxPhase,
} from "@/features/sandbox/sandboxApi.types";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { formatAbsTime, formatDuration, humanize } from "@/lib/formatters";
import styles from "./PhaseDetailDrawer.module.css";

interface PhaseDetailDrawerProps {
  phaseKey: string | null;
  phase: SandboxPhase | null;
  onClose: () => void;
}

function valueToString(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

interface StatusPillSpec {
  className: string;
  icon: ReactNode;
  label: string;
}

function statusPillSpec(status: PhaseStatus): StatusPillSpec {
  switch (status) {
    case "completed":
      return {
        className: styles.statusPillPass,
        icon: <CheckCircle size={11} aria-hidden="true" />,
        label: "Completed",
      };
    case "failed":
      return {
        className: styles.statusPillFail,
        icon: <XCircle size={11} aria-hidden="true" />,
        label: "Failed",
      };
    case "running":
      return {
        className: styles.statusPillRunning,
        icon: <Loader2 size={11} className={styles.spinIcon} aria-hidden="true" />,
        label: "Running",
      };
    case "skipped":
      return {
        className: styles.statusPillNeutral,
        icon: <MinusCircle size={11} aria-hidden="true" />,
        label: "Skipped",
      };
    default:
      return {
        className: styles.statusPillNeutral,
        icon: <Circle size={11} aria-hidden="true" />,
        label: "Pending",
      };
  }
}

export function PhaseDetailDrawer({ phaseKey, phase, onClose }: PhaseDetailDrawerProps) {
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);

  if (!phaseKey || !phase) return null;

  const label = PHASE_LABELS[phaseKey] ?? humanize(phaseKey);
  const detailObj = (phase as unknown as Record<string, unknown>).detail;
  const detailEntries =
    detailObj && typeof detailObj === "object"
      ? Object.entries(detailObj as Record<string, unknown>)
      : [];
  const pill = statusPillSpec(phase.status);

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} aria-hidden="true" />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onKeyDown` is Escape-to-close/Tab-cycling via `useDialogFocusTrap`, supplemental to the close button which remains fully keyboard/screen-reader operable. */}
      <aside
        ref={dialogRef}
        className={styles.drawer}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled elements + `useDialogFocusTrap` rather than the native `<dialog>` element, matching `SaveTeamModal`/`NodeDetailsModal`.
        role="dialog"
        aria-modal="true"
        aria-label={`${label} detail`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderText}>
            <div className={styles.drawerTitleRow}>
              <div className={styles.drawerTitle}>{label}</div>
              <span className={`${styles.statusPill} ${pill.className}`}>
                {pill.icon}
                {pill.label}
              </span>
            </div>
            <div className={styles.drawerIdRow}>{phaseKey}</div>
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.snapshotList}>
            <div className={styles.snapshotItem}>
              <span className={styles.snapshotKey}>Started</span>
              <span className={`${styles.snapshotValue} ${styles.snapshotValueMono}`}>
                {formatAbsTime(phase.started_at != null ? String(phase.started_at) : null)}
              </span>
            </div>
            <div className={styles.snapshotItem}>
              <span className={styles.snapshotKey}>Finished</span>
              <span className={`${styles.snapshotValue} ${styles.snapshotValueMono}`}>
                {formatAbsTime(phase.completed_at != null ? String(phase.completed_at) : null)}
              </span>
            </div>
            <div className={styles.snapshotItem}>
              <span className={styles.snapshotKey}>Duration</span>
              <span className={`${styles.snapshotValue} ${styles.snapshotValueMono}`}>
                {phase.duration_s != null ? formatDuration(phase.duration_s) : "—"}
              </span>
            </div>
          </div>

          {phase.error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={14} aria-hidden="true" />
              <span>{phase.error}</span>
            </div>
          )}

          {detailEntries.length > 0 ? (
            <>
              <div className={styles.detailHeading}>Detail payload</div>
              <div className={styles.kvTable}>
                {detailEntries.map(([k, v]) => (
                  <Fragment key={k}>
                    <span className={styles.kvKey}>{k}</span>
                    <span className={styles.kvValue}>{valueToString(v)}</span>
                  </Fragment>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.emptyStateInline}>No detail payload for this phase.</div>
          )}
        </div>
      </aside>
    </>
  );
}

export default PhaseDetailDrawer;
