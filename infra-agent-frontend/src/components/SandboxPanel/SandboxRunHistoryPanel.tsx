"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, History, Trash2, X } from "lucide-react";
import { useCancelRunMutation, useListRunsQuery } from "@/features/sandbox/sandboxApi";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import styles from "./SandboxConfigForm.module.css";

interface SandboxRunHistoryPanelProps {
  onClose: () => void;
}

function statusClassName(status: string): string {
  if (status === "completed") return styles.statusCompleted;
  if (status === "running") return styles.statusRunning;
  if (status === "failed") return styles.statusFailed;
  return "";
}

/** Run-history drawer, opened from the config page's header button. Ported
 * from `SandboxConfigModal.tsx`'s `showRunHistory` overlay — ` deleteRun`
 * is the same `DELETE /runs/:id` endpoint as cancelling a live run (see
 * `sandboxApi.ts`'s `cancelRun` doc comment), so history-item delete goes
 * through `useCancelRunMutation` rather than a separate endpoint.
 *
 * This is a genuine floating dialog on top of page content (unlike the
 * page-level `SandboxConfigForm` itself), so it keeps real dialog
 * semantics/focus-trap via `useDialogFocusTrap`, matching `SaveTeamModal`/
 * `NodeDetailsModal`. It only ever mounts while the parent's `showHistory`
 * flag is true, so "reset on open" is just this component's own initial
 * `useState` (Pattern 5) — no reset effect needed. */
export function SandboxRunHistoryPanel({ onClose }: SandboxRunHistoryPanelProps) {
  const router = useRouter();
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);
  const { data: runs, isLoading } = useListRunsQuery(20);
  const [cancelRun] = useCancelRunMutation();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  return (
    <div className={styles.runHistoryOverlay}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onKeyDown` here is Escape-to-close/Tab-cycling via `useDialogFocusTrap`, supplemental to the close button which remains fully keyboard/screen-reader operable. */}
      <div
        ref={dialogRef}
        className={styles.runHistoryPanel}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled divs + `useDialogFocusTrap` rather than the native `<dialog>` element, matching `SaveTeamModal`/`EvaluationModal`.
        role="dialog"
        aria-modal="true"
        aria-labelledby="sandbox-run-history-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.runHistoryHeader}>
          <h3 id="sandbox-run-history-title" className={styles.runHistoryTitle}>
            <History size={14} aria-hidden="true" />
            Run History
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close run history"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {isLoading ? (
          <div className={styles.runHistoryList} aria-hidden="true">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.runHistoryItemSkeleton}>
                <div className={styles.skeletonContent}>
                  <div className={styles.skeletonName} />
                  <div className={styles.skeletonMeta} />
                </div>
                <div className={styles.skeletonActions}>
                  <div className={styles.skeletonButton} />
                  <div className={styles.skeletonButton} />
                </div>
              </div>
            ))}
          </div>
        ) : !runs || runs.length === 0 ? (
          <p className={styles.runHistoryEmpty}>No previous runs found.</p>
        ) : (
          <ul className={styles.runHistoryList}>
            {runs.map((item) => {
              const runDate = new Date(item.created_at * 1000);
              const formattedDate = runDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <li key={item.run_id} className={styles.runHistoryItem}>
                  <div className={styles.runHistoryItemInfo}>
                    <span className={styles.runHistoryItemName}>Sandbox Run</span>
                    <div className={styles.runHistoryItemMeta}>
                      <span className={styles.runHistoryItemId}>{item.run_id}</span>
                      <span className={styles.runHistoryItemDot} aria-hidden="true" />
                      <span className={styles.runHistoryItemDate}>{formattedDate}</span>
                    </div>
                  </div>
                  <div className={styles.runHistoryItemRight}>
                    <span
                      className={`${styles.runHistoryItemStatus} ${statusClassName(item.status)}`}
                    >
                      {item.status}
                    </span>
                    <div className={styles.runHistoryItemActions}>
                      <button
                        type="button"
                        className={styles.runHistoryAction}
                        onClick={() => router.push(`/sandbox/runs/${item.run_id}`)}
                        aria-label={`View run ${item.run_id}`}
                      >
                        <Eye size={13} aria-hidden="true" />
                      </button>
                      {deleteConfirmId === item.run_id ? (
                        <button
                          type="button"
                          className={styles.runHistoryActionDanger}
                          onClick={() => {
                            cancelRun(item.run_id);
                            setDeleteConfirmId(null);
                          }}
                        >
                          Confirm
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={styles.runHistoryAction}
                          onClick={() => setDeleteConfirmId(item.run_id)}
                          aria-label={`Delete run ${item.run_id}`}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SandboxRunHistoryPanel;
