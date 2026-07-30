/** Maps planBundle.status values to the display status string. */
const PLAN_STATUS_TO_DISPLAY: Record<string, string> = {
  approve: "approved",
  approved: "approved",
  reject: "rejected",
  rejected: "rejected",
  executing: "in_progress",
  in_progress: "in_progress",
  running: "in_progress",
  completed: "completed",
  done: "completed",
  failed: "failed",
  error: "failed",
};

/**
 * Derives the panel status string.
 *
 * When a planBundle with a definitive status exists (anything beyond
 * pending/awaiting_decision), that status takes precedence over the
 * agent-trace-derived status so the chip updates immediately after
 * the plan_decision SSE event without waiting for agent completed_at.
 */
export function derivePanelStatus(
  planStatus: string | undefined | null,
  queryStatus: string | undefined | null,
  hasProcessing: boolean,
  hasFailed: boolean,
  finalResponseStatus: string | undefined | null,
): string {
  const qs = queryStatus?.toLowerCase();
  if (qs === "completed") {
    return "completed";
  }
  if (qs === "error") {
    return "failed";
  }
  if (qs === "pending_approval" || qs === "awaiting_decision") {
    return "pending_approval";
  }

  const ps = planStatus?.toLowerCase();
  if (ps && ps !== "pending" && ps !== "awaiting_decision") {
    if (ps === "completed" || ps === "done") {
      return "completed";
    }
    return PLAN_STATUS_TO_DISPLAY[ps] ?? "processing";
  }
  if (hasProcessing) {
    return "processing";
  }
  if (hasFailed) {
    return "failed";
  }
  return finalResponseStatus ?? "processing";
}

/** Parse an ISO timestamp string to epoch ms, or null when invalid. */
export function parseTimestampMs(value: string | undefined | null): number | null {
  if (!value) {
    return null;
  }
  const normalized = value.endsWith("Z") ? value : `${value}Z`;
  const parsed = new Date(normalized).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}
