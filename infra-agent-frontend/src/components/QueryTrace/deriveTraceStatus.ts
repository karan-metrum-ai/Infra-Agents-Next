/**
 * Unified status derivation + display formatting for QueryTrace.
 *
 * Centralises all status logic so v1, v2, AgentBlockGroup, SubAgentTile,
 * and TraceHeader share the same vocabulary and priority rules.
 */

import type { Block, BlockStoreState } from "./blockStream/types";
import { hasActiveBlocks } from "./blockStream/blockStatus";
import type { AgentGroup } from "./groupBlocksByAgent";

/** Canonical agent status used by UI components. */
export type AgentStatus = "in_progress" | "completed" | "failed";

/** Human-readable display status for the trace header. */
export type DisplayStatus =
  | "In Progress"
  | "Completed"
  | "Failed"
  | "Awaiting Approval"
  | "Processing";

/* ─── Raw → Display mapping ────────────────────────────────────── */

const RAW_TO_DISPLAY: Record<string, DisplayStatus> = {
  // In-progress family
  processing: "Processing",
  in_progress: "In Progress",
  executing: "In Progress",
  running: "In Progress",
  // Completed family
  completed: "Completed",
  done: "Completed",
  approved: "Completed",
  complete: "Completed",
  // Failed family
  failed: "Failed",
  error: "Failed",
  rejected: "Failed",
  // Awaiting family
  pending_approval: "Awaiting Approval",
  awaiting_decision: "Awaiting Approval",
};

/**
 * Convert a raw backend status string into a human-readable label.
 */
export function formatDisplayStatus(raw: string | undefined | null): DisplayStatus {
  if (!raw) return "Processing";
  return RAW_TO_DISPLAY[raw.toLowerCase()] ?? "Processing";
}

/**
 * Convert a raw backend status into a canonical AgentStatus chip value.
 */
export function toAgentStatus(raw: string | undefined | null): AgentStatus {
  if (!raw) return "in_progress";
  const lower = raw.toLowerCase();
  if (lower === "failed" || lower === "error" || lower === "rejected") return "failed";
  if (lower === "completed" || lower === "done" || lower === "approved" || lower === "complete") {
    return "completed";
  }
  return "in_progress";
}

/* ─── V2 panel status (QueryTracePanel) ────────────────────────── */

export interface TracePanelStatusInput {
  planStatus?: string | null;
  phase?: string | null;
  queryStatus?: string | null;
  hasStreamingBlocks?: boolean;
  hasFailedBlocks?: boolean;
  allBlocksTerminal?: boolean;
  hasBlocks?: boolean;
  finalResponseStatus?: string | null;
}

const TERMINAL_PLAN_STATUSES = new Set([
  "completed",
  "done",
  "failed",
  "error",
  "rejected",
  "reject",
]);

const IN_PROGRESS_PLAN_STATUSES = new Set([
  "executing",
  "in_progress",
  "running",
  "approve",
  "approved",
]);

const POST_APPROVAL_PLAN_STATUSES = new Set([
  ...IN_PROGRESS_PLAN_STATUSES,
  "decision_accepted",
  "accepted",
  "completed",
  "done",
]);

/** True when plan bundle has moved past the HITL gate. */
export function isPostApprovalPlanStatus(planStatus: string | undefined | null): boolean {
  const ps = planStatus?.toLowerCase();
  return !!ps && POST_APPROVAL_PLAN_STATUSES.has(ps);
}

export type FlowLifecycleStatus =
  | "planning"
  | "awaiting_approval"
  | "executing"
  | "completed"
  | "failed";

export interface FlowLifecycleInput {
  queryStatus?: string | null;
  planStatus?: string | null;
  blockPhase?: string | null;
}

/**
 * Single lifecycle source for timeline, header chip, and HITL gating.
 *
 * Reconciles Redux queryStatus (can stay stale after approve), plan bundle,
 * and v2 agent_frame phase so post-approval execution is not masked by
 * lingering pending_approval signals.
 */
export function deriveFlowLifecycleStatus(input: FlowLifecycleInput): FlowLifecycleStatus {
  const qs = input.queryStatus?.toLowerCase() ?? "";
  const ps = input.planStatus?.toLowerCase() ?? "";
  const bp = input.blockPhase?.toLowerCase() ?? "";

  if (bp === "completed" || qs === "completed" || ps === "completed" || ps === "done") {
    return "completed";
  }
  if (
    bp === "failed" ||
    qs === "error" ||
    ps === "failed" ||
    ps === "error" ||
    ps === "rejected" ||
    ps === "reject"
  ) {
    return "failed";
  }

  if (
    bp === "executing" ||
    qs === "executing" ||
    qs === "approved" ||
    isPostApprovalPlanStatus(ps)
  ) {
    return "executing";
  }

  if (
    bp === "interruption_awaited" ||
    qs === "pending_approval" ||
    qs === "awaiting_decision" ||
    ps === "pending" ||
    ps === "awaiting_decision"
  ) {
    return "awaiting_approval";
  }

  return "planning";
}

/**
 * Derive the top-level trace panel status.
 *
 * Priority:
 *   1. Terminal queryStatus (completed, error)
 *   2. Pending approval
 *   3. Block / phase failure
 *   4. Terminal phase or all blocks terminal
 *   5. Active streaming blocks
 *   6. In-progress plan / phase / query signals
 *   7. Fallback completed
 */
export function deriveTracePanelStatus(input: TracePanelStatusInput): string {
  const lifecycle = deriveFlowLifecycleStatus({
    queryStatus: input.queryStatus,
    planStatus: input.planStatus,
    blockPhase: input.phase,
  });

  if (lifecycle === "completed") {
    return "completed";
  }
  if (lifecycle === "failed") {
    return "failed";
  }

  if (input.hasFailedBlocks) {
    return "failed";
  }

  const phase = input.phase?.toLowerCase();
  if (phase === "completed") {
    return "completed";
  }
  if (phase === "failed") {
    return "failed";
  }

  if (input.hasBlocks && input.allBlocksTerminal && !input.hasStreamingBlocks) {
    return "completed";
  }

  if (lifecycle === "awaiting_approval") {
    return "pending_approval";
  }
  if (lifecycle === "executing") {
    return "in_progress";
  }

  const qs = input.queryStatus?.toLowerCase();
  if (qs === "completed") {
    return "completed";
  }
  if (qs === "error") {
    return "failed";
  }

  if (input.hasStreamingBlocks) {
    return "in_progress";
  }

  const ps = input.planStatus?.toLowerCase();
  if (ps && TERMINAL_PLAN_STATUSES.has(ps)) {
    if (ps === "rejected" || ps === "reject") {
      return "rejected";
    }
    if (ps === "failed" || ps === "error") {
      return "failed";
    }
    return "completed";
  }

  if (ps && IN_PROGRESS_PLAN_STATUSES.has(ps)) {
    return "in_progress";
  }

  const phaseMap: Record<string, string> = {
    idle: "processing",
    planning: "processing",
    executing: "in_progress",
    verification: "in_progress",
    interruption_awaited: "in_progress",
  };
  if (phase && phaseMap[phase]) {
    return phaseMap[phase];
  }

  if (qs === "executing" || qs === "approved") {
    return "in_progress";
  }
  if (qs === "processing" || qs === "submitting") {
    return "processing";
  }

  if (input.finalResponseStatus) {
    const fs = input.finalResponseStatus.toLowerCase();
    if (fs === "completed" || fs === "done") {
      return "completed";
    }
    if (fs === "failed" || fs === "error") {
      return "failed";
    }
    if (fs === "pending_approval") {
      return "pending_approval";
    }
  }

  return "processing";
}

/* ─── Agent group status (AgentBlockGroup) ─────────────────────── */

/**
 * Collect all blocks belonging to an agent group, including nested
 * children reached via parent_id.
 */
export function collectBlocksForGroup(group: AgentGroup, snapshot: BlockStoreState): Block[] {
  const topLevelIds = new Set(group.blocks.map((b) => b.id));
  const groupAgentNames = new Set<string>();

  group.blocks.forEach((b) => {
    if (b.kind === "subagent") {
      groupAgentNames.add((b as { agent_name?: string }).agent_name ?? "");
    }
  });

  // Include any nested child blocks whose parent is in this group
  const nested: Block[] = [];
  for (const id of snapshot.order) {
    const block = snapshot.byId[id];
    if (!block) continue;
    if (topLevelIds.has(block.id)) continue;
    if (block.parent_id && topLevelIds.has(block.parent_id)) {
      nested.push(block);
    }
  }

  return [...group.blocks, ...nested];
}

/**
 * Derive the canonical AgentStatus for an agent group.
 *
 * Looks at all blocks (including nested children) and applies:
 *   - any failed → failed
 *   - any streaming/pending → in_progress
 *   - all terminal → completed
 */
export function deriveAgentGroupStatus(group: AgentGroup, snapshot: BlockStoreState): AgentStatus {
  if (snapshot.phase === "completed") {
    return "completed";
  }
  if (snapshot.phase === "failed") {
    return "failed";
  }

  const allBlocks = collectBlocksForGroup(group, snapshot);

  if (allBlocks.some((b) => b.status === "failed")) return "failed";
  if (allBlocks.some((b) => b.status === "streaming" || b.status === "pending")) {
    return "in_progress";
  }

  const hasBlocks = allBlocks.length > 0;
  const allTerminal =
    hasBlocks &&
    allBlocks.every(
      (b) => b.status === "complete" || b.status === "locked" || b.status === "failed",
    );

  if (allTerminal) return "completed";
  return "in_progress";
}

/* ─── Status helpers for individual blocks ─────────────────────── */

/**
 * True when every block in the store has reached a terminal status.
 */
export function areAllBlocksTerminal(snapshot: BlockStoreState): boolean {
  if (snapshot.order.length === 0) {
    return false;
  }
  for (const id of snapshot.order) {
    const block = snapshot.byId[id];
    if (!block) {
      continue;
    }
    if (block.status !== "complete" && block.status !== "locked" && block.status !== "failed") {
      return false;
    }
  }
  return true;
}

/**
 * True when any block in the store is actively streaming.
 */
export function hasStreamingBlocks(snapshot: BlockStoreState): boolean {
  return hasActiveBlocks(snapshot);
}

/**
 * True when any block in the store has failed.
 */
export function hasFailedBlocks(snapshot: BlockStoreState): boolean {
  for (const id of snapshot.order) {
    const block = snapshot.byId[id];
    if (block && block.status === "failed") {
      return true;
    }
  }
  return false;
}

/**
 * Count how many agent groups are still in_progress.
 */
export function countActiveAgentGroups(groups: AgentGroup[], snapshot: BlockStoreState): number {
  return groups.filter((g) => deriveAgentGroupStatus(g, snapshot) === "in_progress").length;
}
