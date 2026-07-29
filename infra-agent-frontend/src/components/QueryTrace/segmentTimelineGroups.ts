/**
 * Splits agent groups into timeline segments for LiveBlockStream.
 *
 * Consecutive device-triage sub-agents (spawned by
 * ``triage_devices_parallel``) collapse into one parallel cluster
 * segment. Orchestrator, primary (L1/NOC), and named specialists
 * keep full agent sections.
 *
 * Pulled forward from Vite's `components/QueryTrace/blocks/` subtree —
 * `useBlockStream.ts`'s `selectActiveSubAgents`/`selectPrimarySubAgent`
 * selectors need this as a hard dependency. The rest of `blocks/` (the
 * React rendering layer) lands in a later Phase 8 pass; reconcile this
 * file with that port instead of keeping two copies.
 */

import { isSpecialistAgentName } from "./flowTraceMerge";
import type { SubAgentBlock } from "./blockStream/types";
import type { AgentGroup } from "./groupBlocksByAgent";

const PRIMARY_AGENT_PATTERNS = [
  "level1",
  "level_1",
  "level-1",
  "noc",
  "noc_analyst",
  "noc-analyst",
  "report_generator",
  "report-generator",
  "operations_manager",
  "operations-manager",
];

/** True for Level 1, NOC, report generator, and orchestrator agents. */
export function isPrimaryAgent(name: string): boolean {
  const normalized = name.toLowerCase().replace(/-/g, "_").trim();
  return PRIMARY_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/** True when a sub-agent block belongs in the parallel device grid. */
export function isParallelDeviceSubAgent(sub: SubAgentBlock): boolean {
  if (isPrimaryAgent(sub.agent_name)) {
    return false;
  }
  if (isSpecialistAgentName(sub.agent_name)) {
    return false;
  }
  return true;
}

export type TimelineSegment =
  | { kind: "agent"; group: AgentGroup }
  | { kind: "parallel_cluster"; agents: SubAgentBlock[] };

function extractParallelSubAgent(group: AgentGroup): SubAgentBlock | null {
  if (group.role !== "subagent" || group.blocks.length === 0) {
    return null;
  }
  const sub = group.blocks.find((block): block is SubAgentBlock => block.kind === "subagent");
  if (!sub || !isParallelDeviceSubAgent(sub)) {
    return null;
  }
  return sub;
}

/**
 * Collapse consecutive parallel device sub-agent groups into one
 * cluster segment while preserving order of all other groups.
 */
export function segmentTimelineGroups(groups: AgentGroup[]): TimelineSegment[] {
  const segments: TimelineSegment[] = [];
  let pendingParallel: SubAgentBlock[] = [];

  const flushParallel = () => {
    if (pendingParallel.length === 0) {
      return;
    }
    segments.push({
      kind: "parallel_cluster",
      agents: pendingParallel,
    });
    pendingParallel = [];
  };

  for (const group of groups) {
    const parallelSub = extractParallelSubAgent(group);
    if (parallelSub) {
      pendingParallel.push(parallelSub);
      continue;
    }
    flushParallel();
    segments.push({ kind: "agent", group });
  }

  flushParallel();
  return segments;
}
