"use client";

/**
 * ApprovalAlertBadge
 *
 * Global bell/badge indicator for pending HITL (Human-in-the-Loop)
 * approvals: a count badge plus a read-only popover listing each pending
 * approval. Clicking a row opens the Redux-tracked approval dialog
 * (`openApprovalDialog`) or, for the synthetic plan-level approval, calls
 * `onPlanApprovalClick`. The actual approve/deny action UI
 * (`ApprovalDialog`) is real Phase 13 scope, not ported here — its only
 * Vite mount point (`TeamsDashboard.tsx`) was never built in this app (see
 * CLAUDE.md Phase 5/8/11's documented deferrals); porting it now would have
 * no reachable call site.
 *
 * Honesty note: on this app's one live mount point today
 * (`LiveDashboardShell`, "teams" tab), `pendingApprovals` will almost
 * always render empty. `AgentTeamView.tsx` (the interim stand-in for that
 * tab) doesn't yet dispatch `addApproval`/`addApprovals` the way
 * `useFlowStream.ts`'s event router does elsewhere in the app — Phase 8's
 * QueryTrace machinery isn't wired into any live page consumer yet (see
 * that phase's own "live-integration caveat" in CLAUDE.md). This component
 * and its wiring are still correct and forward-compatible: once a real
 * chat/query view populates approvals on this route, the bell "just works"
 * with no further changes here.
 */

import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import { Bell, CheckCircle2, ChevronRight, GitBranch, ShieldAlert } from "lucide-react";
import { PLAN_APPROVAL_ID } from "@/components/QueryTrace/flowStreamHelpers";
import { openApprovalDialog } from "@/features/approvals/approvalsSlice";
import type { PendingApproval } from "@/features/approvals/approvalsSlice";
import {
  selectPendingApprovalCount,
  selectPendingApprovals,
} from "@/features/approvals/approvalsSelectors";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useMountEffect } from "@/hooks/useMountEffect";
import styles from "./ApprovalAlertBadge.module.css";
import type { ApprovalAlertBadgeProps } from "./ApprovalAlertBadge.types";

/** "device_temperature_threshold" → "Device Temperature Threshold". */
function formatDisplayName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Mounted only while the popover is open — the sans-effect skill's
 * "conditional mounting" pattern (Pattern 4) for a mount-time external DOM
 * subscription. Owning the mousedown/Escape listeners in a child that only
 * exists while `isPopoverOpen` is true means the listener is attached and
 * torn down as one clean mount/unmount pair via `useMountEffect`, instead
 * of a bare `useEffect` re-running on every `isOpen` toggle with an
 * `if (isOpen)` guard inside the effect body — the exact anti-pattern the
 * skill calls out. (This codebase's `ProfileAvatar`/`CenterNavPanel` still
 * use that guarded-bare-`useEffect` shape; CLAUDE.md's Phase 8 notes flags
 * that as a pre-Phase-13 finding not yet retrofitted. This component
 * doesn't repeat it.) Renders nothing — it exists purely to own the
 * listener's lifecycle.
 */
function OutsideClickWatcher({
  containerRef,
  onClose,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  useMountEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  return null;
}

/** Global bell/badge indicator for pending HITL approvals, with a read-only popover list. */
export function ApprovalAlertBadge({
  onApprovalClick,
  onPlanApprovalClick,
  disabled = false,
}: ApprovalAlertBadgeProps) {
  const dispatch = useAppDispatch();
  const pendingApprovals = useAppSelector(selectPendingApprovals);
  const approvalCount = useAppSelector(selectPendingApprovalCount);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleApprovalClick = useCallback(
    (approval: PendingApproval) => {
      setIsPopoverOpen(false);

      // Plan-level approval → scroll/open the trace panel instead of a dialog.
      if (approval.approval_id === PLAN_APPROVAL_ID) {
        onPlanApprovalClick?.();
        onApprovalClick?.(approval);
        return;
      }

      dispatch(openApprovalDialog(approval.approval_id));
      onApprovalClick?.(approval);
    },
    [dispatch, onApprovalClick, onPlanApprovalClick],
  );

  const hasApprovals = approvalCount > 0;
  const countLabel = `${approvalCount} pending approval${approvalCount === 1 ? "" : "s"}`;
  const statusLabel = disabled
    ? "Approvals available in Agentic Team view"
    : hasApprovals
      ? countLabel
      : "No pending approvals";

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.alertButton} ${hasApprovals && !disabled ? styles.alertButtonActive : ""}`}
        onClick={disabled ? undefined : () => setIsPopoverOpen((prev) => !prev)}
        disabled={disabled}
        aria-label={statusLabel}
        aria-haspopup={disabled ? undefined : "menu"}
        aria-expanded={disabled ? undefined : isPopoverOpen}
        aria-controls={disabled ? undefined : "approval-alert-badge-popover"}
        title={disabled ? "Switch to Agentic Team to action approvals" : statusLabel}
      >
        <Bell
          size={20}
          aria-hidden="true"
          className={hasApprovals ? styles.iconPulse : undefined}
        />
        {hasApprovals && (
          <span className={styles.badge} aria-hidden="true">
            {approvalCount > 9 ? "9+" : approvalCount}
          </span>
        )}
      </button>

      {isPopoverOpen && (
        <>
          <OutsideClickWatcher
            containerRef={containerRef}
            onClose={() => setIsPopoverOpen(false)}
          />
          <div
            id="approval-alert-badge-popover"
            className={styles.popover}
            role="menu"
            aria-label="Pending approvals"
          >
            <div className={styles.popoverHeader}>
              <div className={styles.popoverTitle}>
                <ShieldAlert size={18} className={styles.popoverIcon} aria-hidden="true" />
                <span className={styles.popoverTitleText}>Pending Approvals</span>
              </div>
              <span className={styles.popoverCount}>{approvalCount}</span>
            </div>

            <div className={styles.approvalList}>
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((approval) => {
                  const isPlanApproval = approval.approval_id === PLAN_APPROVAL_ID;
                  return (
                    <button
                      type="button"
                      key={approval.approval_id}
                      role="menuitem"
                      className={`${styles.approvalItem} ${isPlanApproval ? styles.planApprovalItem : ""}`}
                      onClick={() => handleApprovalClick(approval)}
                    >
                      <span className={styles.approvalIndicator} aria-hidden="true">
                        {isPlanApproval ? <GitBranch size={16} /> : <ShieldAlert size={16} />}
                      </span>
                      <span className={styles.approvalContent}>
                        <span className={styles.approvalTool}>
                          {formatDisplayName(approval.tool_name)}
                        </span>
                        <span className={styles.approvalMeta}>
                          <span className={styles.approvalAgent}>
                            {isPlanApproval
                              ? "Requires your decision"
                              : formatDisplayName(approval.agent_name)}
                          </span>
                          <span className={styles.approvalDot} aria-hidden="true" />
                          <span className={styles.approvalTime}>
                            {formatRelativeTime(approval.created_at)}
                          </span>
                        </span>
                      </span>
                      <ChevronRight size={16} className={styles.approvalArrow} aria-hidden="true" />
                    </button>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <CheckCircle2 size={32} className={styles.emptyIcon} aria-hidden="true" />
                  <p className={styles.emptyText}>No pending approvals</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ApprovalAlertBadge;
