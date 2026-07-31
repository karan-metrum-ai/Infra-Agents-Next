import type { PendingApproval } from "@/features/approvals/approvalsSlice";

export interface ApprovalAlertBadgeProps {
  /** Fired whenever any approval row (including the plan-level one) is clicked. */
  onApprovalClick?: (approval: PendingApproval) => void;
  /**
   * Fired for the synthetic plan-level approval instead of opening the
   * per-tool approval dialog — meant to scroll to / open a trace panel.
   * No route in this app wires a trace panel here yet; see the doc
   * comment atop `ApprovalAlertBadge.tsx` for why this is commonly left
   * `undefined` today.
   */
  onPlanApprovalClick?: () => void;
  /**
   * When true, the bell renders but is non-interactive — for views where
   * approvals cannot be actioned (Command Center, Physical Systems, Reporting).
   */
  disabled?: boolean;
}
