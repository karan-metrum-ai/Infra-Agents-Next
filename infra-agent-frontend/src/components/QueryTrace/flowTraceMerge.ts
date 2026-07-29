/**
 * Helpers for merging v1 flow trace snapshots and selecting supplemental
 * agents when the v2 block stream is incomplete.
 */

import type { FlowPayload, TaskNode } from "./flowPayload.types";
import type { ParsedAgentTrace } from "./traceDataParser";
import type { BlockStoreState, SubAgentBlock } from "./blockStream/types";

const ORCHESTRATOR_PATTERNS = ["operations_manager", "operations-manager"];

const PRIMARY_AGENT_PATTERNS = [
  "level1",
  "level_1",
  "level-1",
  "noc",
  "noc_analyst",
  "noc-analyst",
  "report_generator",
  "report-generator",
];

const SPECIALIST_AGENT_PATTERNS = [
  "agent",
  "admin",
  "specialist",
  "cooling",
  "storage",
  "network",
  "wlan",
  "vastai",
  "metrumai",
  "systems",
];

/** Count trace entries that represent named agent executions. */
export function countNamedTraceEntries(trace: unknown): number {
  if (!Array.isArray(trace)) {
    return 0;
  }
  return trace.filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as { name?: string }).name === "string" &&
      (entry as { name: string }).name.length > 0,
  ).length;
}

/**
 * Merge incoming flow payload into existing Redux flow data.
 *
 * Keeps the trace array with more named agent entries so SSE empty
 * snapshots cannot wipe a richer REST baseline.
 */
export function mergeFlowPayload(existing: FlowPayload | null, incoming: FlowPayload): FlowPayload {
  if (!existing) {
    return incoming;
  }
  const existingCount = countNamedTraceEntries(existing.trace);
  const incomingCount = countNamedTraceEntries(incoming.trace);
  if (incomingCount >= existingCount) {
    return { ...existing, ...incoming };
  }
  return {
    ...existing,
    ...incoming,
    trace: existing.trace,
  };
}

function normalizeAgentKey(name: string): string {
  return name.toLowerCase().replace(/-/g, "_").trim();
}

/** True when the trace agent name is the Operations Manager. */
export function isOrchestratorAgent(name: string): boolean {
  const normalized = normalizeAgentKey(name);
  return ORCHESTRATOR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function agentNamesMatch(traceName: string, blockName: string): boolean {
  const a = normalizeAgentKey(traceName);
  const b = normalizeAgentKey(blockName);
  if (a === b) {
    return true;
  }
  if (a.includes(b) || b.includes(a)) {
    return true;
  }
  const level1 = ["level1", "level_1", "noc", "noc_analyst"];
  const aIsL1 = level1.some((p) => a.includes(p));
  const bIsL1 = level1.some((p) => b.includes(p));
  return aIsL1 && bIsL1;
}

/** True when a subagent block has goal text or nested child blocks. */
export function subagentBlockHasRenderableContent(
  block: SubAgentBlock,
  state: BlockStoreState,
): boolean {
  if (block.content?.trim()) {
    return true;
  }
  return state.order.some((id) => state.byId[id]?.parent_id === block.id);
}

/**
 * True when the v2 block store already has renderable coverage for
 * ``agentName`` (non-empty subagent shell or nested children).
 */
export function agentHasRenderableV2Coverage(agentName: string, state: BlockStoreState): boolean {
  const key = normalizeAgentKey(agentName);
  for (const id of state.order) {
    const block = state.byId[id];
    if (block?.kind !== "subagent") {
      continue;
    }
    const sub = block as SubAgentBlock;
    if (!agentNamesMatch(key, normalizeAgentKey(sub.agent_name))) {
      continue;
    }
    // Any matching subagent shell is owned by the v2 timeline — even
    // before nested reasoning/tool blocks arrive over SSE.
    return true;
  }
  return false;
}

/**
 * v1 agents not yet covered by renderable v2 subagent blocks — used for
 * hybrid rendering so delegated specialists still appear when the v2
 * stream only created an empty delegation shell.
 */
export function getSupplementalAgents(
  agents: ParsedAgentTrace[],
  blockSnapshot: BlockStoreState,
): ParsedAgentTrace[] {
  return agents.filter((agent) => {
    if (isOrchestratorAgent(agent.name)) {
      return false;
    }
    return !agentHasRenderableV2Coverage(agent.name, blockSnapshot);
  });
}

function isPrimaryAgent(name: string): boolean {
  const normalized = normalizeAgentKey(name);
  return PRIMARY_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/** True when a subagent block represents a named specialist agent. */
export function isSpecialistAgentName(agentName: string): boolean {
  if (isOrchestratorAgent(agentName) || isPrimaryAgent(agentName)) {
    return false;
  }
  const normalized = normalizeAgentKey(agentName);
  return SPECIALIST_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function blockStatusToTaskStatus(block: SubAgentBlock): string {
  if (block.status === "failed") {
    return "failed";
  }
  if (block.status === "complete" || block.status === "locked") {
    return "completed";
  }
  return "executing";
}

/**
 * Merge runtime specialist delegations from the v2 block stream into
 * plan DAG nodes for Task Assignments.
 *
 * The initial plan DAG may only include the Operations Manager and
 * Level 1 Support. Specialists delegated during execution (e.g.
 * liquid_cooling_agent) appear as subagent blocks in the block stream
 * but are not added to ``dag_export`` on the backend.
 */
export function mergeDelegatedTaskNodes(
  nodes: TaskNode[],
  blockSnapshot: BlockStoreState,
): TaskNode[] {
  const merged = [...nodes];

  for (const id of blockSnapshot.order) {
    const block = blockSnapshot.byId[id];
    if (!block || block.kind !== "subagent" || block.parent_id) {
      continue;
    }

    const sub = block as SubAgentBlock;
    const agentName = sub.agent_name?.trim();
    if (!agentName || !isSpecialistAgentName(agentName)) {
      continue;
    }

    // `inferAgentName()` (agentFrameReducer.ts) falls back to the literal
    // sentinel "agent" when a child block's delegation shell never arrived
    // and its tool name doesn't match a known specialist. This does not
    // identify a real, addressable agent — never fabricate a Task
    // Assignment card for it.
    if (normalizeAgentKey(agentName) === "agent") {
      continue;
    }

    const goal = sub.content?.trim() || `Delegated to ${agentName}`;
    const taskStatus = blockStatusToTaskStatus(sub);
    const existingIdx = merged.findIndex((node) =>
      agentNamesMatch(node.target_agent ?? "", agentName),
    );

    if (existingIdx >= 0) {
      merged[existingIdx] = {
        ...merged[existingIdx],
        status: taskStatus,
        goal: merged[existingIdx].goal || goal,
      };
      continue;
    }

    merged.push({
      task_id: `delegated-${normalizeAgentKey(agentName)}`,
      goal,
      target_agent: agentName,
      status: taskStatus,
    });
  }

  return merged;
}
