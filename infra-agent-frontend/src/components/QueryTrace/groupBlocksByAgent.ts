/**
 * Groups flat v2 blocks into agent-segregated sections for rendering.
 *
 * The block store emits blocks in flat arrival order. This utility:
 *   1. Groups them into logical agent sections (orchestrator, primary, sub-agent)
 *   2. Merges consecutive same-kind blocks within each group so that
 *      e.g. two consecutive "reasoning" or "text" blocks become one
 *      block with appended content.
 *
 * Roles:
 *   - orchestrator: Operations Manager (top-level coordinator)
 *   - primary: Primary delegated agents (Level 1 Support, NOC, Report
 *     Generator) that render as top-level agent sections
 *   - subagent: Specialist/device sub-agents
 *
 * Pulled forward from Vite's `components/QueryTrace/blocks/` subtree —
 * `deriveTraceStatus.ts` and `segmentTimelineGroups.ts` (both in this
 * Phase 8 slice) need `AgentGroup`/`groupBlocksByAgent` as a hard
 * dependency. The rest of `blocks/` (the React rendering layer) lands
 * in a later Phase 8 pass; reconcile this file with that port instead
 * of keeping two copies.
 */
import type { Block, SubAgentBlock, TextBlock, ReasoningBlock } from "./blockStream/types";

export type AgentGroupRole = "orchestrator" | "primary" | "subagent";

export interface AgentGroup {
  id: string;
  agentName: string;
  displayName: string;
  role: AgentGroupRole;
  blocks: Block[];
}

function getDisplayName(name: string): string {
  const map: Record<string, string> = {
    operations_manager: "Operations Manager",
    operations_manager_agent: "Operations Manager",
    level1_support: "Level 1 Support",
    "level1-support": "Level 1 Support",
    noc_analyst: "Level 1 Support",
    systems_admin_hw: "Hardware Operations",
    systems_admin_os: "OS Operations",
    wlan_network_agent: "WLAN Network Specialist",
    wlan_network_specialist: "WLAN Network Specialist",
    vastai_agent: "NeoCloud Provisioning Agent",
    metrumai_insights_agent: "MetrumAI Insights Agent",
    liquid_cooling_agent: "Liquid Cooling Specialist",
    report_generator: "Report Generator",
    "report-generator": "Report Generator",
  };

  const normalized = name.toLowerCase().replace(/-/g, "_").trim();
  if (map[normalized]) return map[normalized];

  if (normalized.includes("noc") || normalized.includes("level1")) {
    return "Level 1 Support";
  }

  return name
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Merges consecutive same-kind blocks within a list. For text and
 * reasoning blocks, content is concatenated. For other kinds, they
 * remain separate entries.
 */
function mergeConsecutiveBlocks(blocks: Block[]): Block[] {
  if (blocks.length === 0) return blocks;

  const merged: Block[] = [];
  let current = blocks[0];

  for (let i = 1; i < blocks.length; i++) {
    const next = blocks[i];

    if (current.kind === next.kind && canMerge(current.kind)) {
      current = mergeTwo(current, next);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);
  return merged;
}

function canMerge(kind: string): boolean {
  return kind === "text" || kind === "reasoning";
}

function mergeTwo(a: Block, b: Block): Block {
  if (a.kind === "text" && b.kind === "text") {
    const merged: TextBlock = {
      ...a,
      content: a.content + "\n\n" + (b as TextBlock).content,
      status: b.status,
      locked: a.locked && b.locked,
    };
    return merged;
  }
  if (a.kind === "reasoning" && b.kind === "reasoning") {
    const merged: ReasoningBlock = {
      ...a,
      content: a.content + "\n\n" + (b as ReasoningBlock).content,
      status: b.status,
      locked: a.locked && b.locked,
    };
    return merged;
  }
  return b;
}

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

function isPrimaryAgent(name: string): boolean {
  const normalized = name.toLowerCase().replace(/-/g, "_").trim();
  return PRIMARY_AGENT_PATTERNS.some((p) => normalized.includes(p));
}

export function groupBlocksByAgent(blocks: Block[]): AgentGroup[] {
  const groups: AgentGroup[] = [];
  let currentGroup: AgentGroup | null = null;

  for (const block of blocks) {
    if (block.kind === "subagent") {
      const sub = block as SubAgentBlock;
      const agentKey = sub.agent_name || "unknown";
      const role: AgentGroupRole = isPrimaryAgent(agentKey) ? "primary" : "subagent";

      if (currentGroup && currentGroup.role === role && currentGroup.agentName === agentKey) {
        currentGroup.blocks.push(block);
      } else {
        currentGroup = {
          id: `group-${block.id}`,
          agentName: agentKey,
          displayName: getDisplayName(agentKey),
          role,
          blocks: [block],
        };
        groups.push(currentGroup);
      }
    } else {
      if (currentGroup && currentGroup.role === "orchestrator") {
        currentGroup.blocks.push(block);
      } else {
        currentGroup = {
          id: `group-${block.id}`,
          agentName: "operations_manager",
          displayName: "Operations Manager",
          role: "orchestrator",
          blocks: [block],
        };
        groups.push(currentGroup);
      }
    }
  }

  // Merge consecutive same-kind blocks within each group
  for (const group of groups) {
    group.blocks = mergeConsecutiveBlocks(group.blocks);
  }

  return groups;
}
