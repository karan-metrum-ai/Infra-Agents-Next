/**
 * Adapter: transforms flat ParsedAgentTrace[] into a recursive AgentNode tree.
 *
 * Classification:
 *   - manager: operations_manager variants
 *   - level1: level1_support, NOC analyst variants
 *   - specialist: everything else (hw, os, wlan, vastai, metrumai, ...)
 *
 * Nesting: specialists attach beneath the most recent preceding level1 node.
 * Fallback: attach to the manager, then top-level.
 */
import type { ParsedAgentTrace } from "../traceDataParser";
import { getAgentDisplayName } from "../traceDataParser";
import type { AgentNode, AgentRole, ToolCall } from "./types";

const MANAGER_PATTERNS = ["operations_manager", "operations-manager"];

const LEVEL1_PATTERNS = ["level1", "level_1", "level-1", "noc", "noc_analyst", "noc-analyst"];

function classifyAgent(name: string): AgentRole {
  const normalized = name.toLowerCase().trim();

  if (MANAGER_PATTERNS.some((p) => normalized.includes(p))) {
    return "manager";
  }
  if (LEVEL1_PATTERNS.some((p) => normalized.includes(p))) {
    return "level1";
  }
  return "specialist";
}

function mapToolCalls(raw: ParsedAgentTrace["tool_calls"]): ToolCall[] {
  if (!raw || raw.length === 0) return [];
  return raw.map((tc) => ({
    tool_name: tc.tool_name,
    status: tc.status || undefined,
    args: (tc as unknown as Record<string, unknown>).args as Record<string, unknown> | undefined,
    result: (tc as unknown as Record<string, unknown>).result as string | undefined,
    duration_ms: (tc as unknown as Record<string, unknown>).duration_ms as number | undefined,
  }));
}

function toAgentNode(agent: ParsedAgentTrace, index: number): AgentNode {
  const role = classifyAgent(agent.name);
  return {
    id: `${agent.name}-${index}`,
    name: agent.name,
    displayName: getAgentDisplayName(agent.name),
    role,
    query: agent.query || undefined,
    reasoning: agent.reasoning_content || [],
    toolCalls: mapToolCalls(agent.tool_calls),
    response: agent.agent_response || "",
    status: agent.status,
    createdAt: agent.created_at || undefined,
    completedAt: agent.completed_at || null,
    durationMs: agent.duration_ms,
    children: [],
  };
}

export function buildAgentTree(agents: ParsedAgentTrace[]): AgentNode[] {
  const roots: AgentNode[] = [];
  let lastManager: AgentNode | null = null;
  let lastLevel1: AgentNode | null = null;

  for (let i = 0; i < agents.length; i++) {
    const node = toAgentNode(agents[i], i);

    if (node.role === "manager") {
      roots.push(node);
      lastManager = node;
    } else if (node.role === "level1") {
      if (lastManager) {
        lastManager.children.push(node);
      } else {
        roots.push(node);
      }
      lastLevel1 = node;
    } else {
      // specialist — nest under most recent level1, else manager, else root
      if (lastLevel1) {
        lastLevel1.children.push(node);
      } else if (lastManager) {
        lastManager.children.push(node);
      } else {
        roots.push(node);
      }
    }
  }

  return roots;
}
