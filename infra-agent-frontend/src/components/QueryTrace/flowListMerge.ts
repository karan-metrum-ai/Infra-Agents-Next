/**
 * Monotonic merge helpers for Query History flow list rows.
 *
 * Prevents periodic REST refreshes from downgrading terminal statuses or
 * replacing the user's original question with delegated task goals.
 */

import type { FlowListItem } from "./flowPayload.types";

const TERMINAL_STATUSES = new Set(["completed", "done", "error", "failed"]);

const ACTIVE_STATUSES = new Set([
  "accepted",
  "active",
  "executing",
  "in_progress",
  "pending",
  "pending_approval",
  "processing",
  "running",
  "submitting",
]);

/** True when a flow list status is terminal (completed or failed). */
export function isTerminalFlowListStatus(status: string | undefined | null): boolean {
  if (!status) {
    return false;
  }
  return TERMINAL_STATUSES.has(status.toLowerCase().trim());
}

/**
 * True when text looks like a delegated task goal rather than a user
 * question (e.g. "Collect CPU metrics for host …").
 */
export function looksLikeDelegatedTaskGoal(query: string): boolean {
  const text = query.trim();
  if (!text) {
    return false;
  }
  return /^collect\s+/i.test(text) || /\(execution_mode=/i.test(text) || /\(execu/i.test(text);
}

/**
 * Pick the better query string when merging list rows.
 *
 * Prefers the existing user question over incoming task-goal text.
 */
export function mergeFlowListQuery(
  existing: string | undefined | null,
  incoming: string | undefined | null,
): string {
  const prev = (existing ?? "").trim();
  const next = (incoming ?? "").trim();
  if (!next) {
    return prev;
  }
  if (!prev) {
    return next;
  }
  if (looksLikeDelegatedTaskGoal(next) && !looksLikeDelegatedTaskGoal(prev)) {
    return prev;
  }
  if (!looksLikeDelegatedTaskGoal(next) && looksLikeDelegatedTaskGoal(prev)) {
    return next;
  }
  if (next.length > prev.length) {
    return next;
  }
  return prev;
}

/**
 * Pick the higher-precedence status when merging list rows.
 *
 * Never downgrade terminal status to active/pending.
 */
export function mergeFlowListStatus(
  existing: string | undefined | null,
  incoming: string | undefined | null,
  existingCompletedAt?: string | null,
  incomingCompletedAt?: string | null,
): string {
  const prev = (existing ?? "").trim();
  const next = (incoming ?? "").trim();

  if (existingCompletedAt && !incomingCompletedAt) {
    return isTerminalFlowListStatus(prev) ? prev : "completed";
  }
  if (!existingCompletedAt && incomingCompletedAt) {
    return isTerminalFlowListStatus(next) ? next : "completed";
  }
  if (isTerminalFlowListStatus(prev) && !isTerminalFlowListStatus(next)) {
    return prev;
  }
  if (!isTerminalFlowListStatus(prev) && isTerminalFlowListStatus(next)) {
    return next;
  }
  if (!next) {
    return prev;
  }
  if (!prev) {
    return next;
  }
  if (ACTIVE_STATUSES.has(next.toLowerCase()) && isTerminalFlowListStatus(prev)) {
    return prev;
  }
  return next;
}

/**
 * Merge two flow list items for the same correlation_id.
 *
 * Incoming API data wins for non-regressive fields; terminal status and
 * user query are preserved when the merge would regress them.
 */
export function mergeFlowListItems(existing: FlowListItem, incoming: FlowListItem): FlowListItem {
  const mergedStatus = mergeFlowListStatus(
    existing.status,
    incoming.status,
    existing.completed_at,
    incoming.completed_at,
  );
  const mergedQuery = mergeFlowListQuery(existing.query, incoming.query);

  return {
    ...existing,
    ...incoming,
    query: mergedQuery,
    status: mergedStatus,
    completed_at: existing.completed_at ?? incoming.completed_at ?? null,
    evaluation_status: incoming.evaluation_status ?? existing.evaluation_status,
    score: incoming.score ?? existing.score ?? null,
  };
}
