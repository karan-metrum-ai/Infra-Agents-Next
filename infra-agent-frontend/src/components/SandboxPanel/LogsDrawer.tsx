"use client";

/**
 * LogsDrawer -- terminal-style viewer for pod logs.
 *
 * Lazy-loads when the drawer first opens (avoids the heavy
 * `/v1/sandbox/runs/:runId/logs` response until the user wants it). One
 * tab per pod; the active pod's log is rendered as plain preformatted
 * text on a near-black background.
 *
 * Adaptation notes:
 *  - Lazy-load is preserved via `useSandboxLogs(runId, open)`'s `enabled`
 *    flag (already built this phase, RTK Query `skipToken`-backed) --
 *    no raw fetch, no manual loading state.
 *  - The source's "default `activePod` to the first pod once loaded" was
 *    a `useEffect` that synced local state from derived data. Per this
 *    app's zero-`useEffect` discipline (Pattern 1: derive, don't sync),
 *    `activePod` here only tracks an explicit user override; the
 *    effective tab is `selectedPod ?? pods[0] ?? null`, computed inline
 *    every render instead of mirrored into state.
 *  - The ad hoc `document.addEventListener("keydown", ...)` Escape
 *    handler is replaced by `useDialogFocusTrap`, matching
 *    `SandboxRunHistoryPanel`/`PhaseDetailDrawer` (adds Tab-cycling,
 *    initial focus, and focus restoration for free).
 *  - Tailwind's `animate-spin` (banned here) becomes the co-located
 *    `.spinIcon` class driving the app's global `spin` keyframe.
 */

import { useState } from "react";
import { AlertCircle, Loader2, Terminal, X } from "lucide-react";

import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { useSandboxLogs } from "./useSandboxArtifact";
import styles from "./LogsDrawer.module.css";

interface LogsDrawerProps {
  runId: string;
  open: boolean;
  onClose: () => void;
}

export function LogsDrawer({ runId, open, onClose }: LogsDrawerProps) {
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);
  const { data, isLoading, error } = useSandboxLogs(runId, open);
  const [selectedPod, setSelectedPod] = useState<string | null>(null);

  if (!open) return null;

  const pods = Object.keys(data ?? {}).filter((k) => k !== "message");
  const activePod = selectedPod && pods.includes(selectedPod) ? selectedPod : (pods[0] ?? null);

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
        aria-label="Pod logs"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderText}>
            <div className={styles.drawerTitleRow}>
              <Terminal size={14} className={styles.drawerTitleIcon} aria-hidden="true" />
              <div className={styles.drawerTitle}>Pod logs</div>
            </div>
            {pods.length > 0 && (
              <div className={styles.drawerSubtitle}>
                {pods.length} pod{pods.length === 1 ? "" : "s"} streaming
              </div>
            )}
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Close logs drawer"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {isLoading && (
          <div className={styles.emptyState}>
            <Loader2 size={20} className={styles.spinIcon} aria-hidden="true" />
            <span>Streaming logs…</span>
          </div>
        )}

        {error && (
          <div className={styles.errorBanner}>
            <AlertCircle size={14} aria-hidden="true" />
            <span>Failed to load logs: {error}</span>
          </div>
        )}

        {!isLoading && !error && pods.length === 0 && (
          <div className={styles.emptyState}>
            <Terminal size={28} className={styles.emptyStateIcon} aria-hidden="true" />
            <span>No logs captured for this run yet.</span>
          </div>
        )}

        {pods.length > 0 && (
          <>
            <div className={styles.logsTabs}>
              {pods.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`${styles.logsTab} ${activePod === p ? styles.logsTabActive : ""}`}
                  onClick={() => setSelectedPod(p)}
                  aria-current={activePod === p}
                >
                  {p}
                </button>
              ))}
            </div>
            <pre className={styles.logsTerminal}>
              {(activePod ? data?.[activePod] : "") || "No log output"}
            </pre>
          </>
        )}
      </aside>
    </>
  );
}

export default LogsDrawer;
