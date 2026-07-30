/**
 * Adapts v1 REST/SSE trace agents into v2 AgentGroup blocks so
 * supplemental delegated agents render with the same UI as the block
 * stream (ThinkingAccordion, tool rows, hierarchy spine).
 */
import type { Block, ReasoningBlock, TextBlock, ToolBlock } from "../blockStream/types";
import type { AgentGroup, AgentGroupRole } from "../groupBlocksByAgent";
import type { ParsedAgentTrace } from "../traceDataParser";
import { getAgentDisplayName } from "../traceDataParser";

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

function resolveRole(name: string): AgentGroupRole {
  const normalized = name.toLowerCase().replace(/-/g, "_").trim();
  if (normalized.includes("operations_manager") || normalized.includes("operations-manager")) {
    return "orchestrator";
  }
  if (PRIMARY_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return "primary";
  }
  return "subagent";
}

function parsedAgentToBlocks(agent: ParsedAgentTrace): Block[] {
  const blocks: Block[] = [];
  const baseTime = Date.parse(agent.created_at) || Date.now();

  agent.reasoning_content.forEach((content, index) => {
    const reasoning: ReasoningBlock = {
      id: `v1-reasoning-${agent.name}-${index}`,
      kind: "reasoning",
      content,
      status: "complete",
      locked: true,
      created_at: baseTime + index,
    };
    blocks.push(reasoning);
  });

  (agent.tool_calls ?? []).forEach((toolCall, index) => {
    const tool: ToolBlock = {
      id: `v1-tool-${agent.name}-${index}`,
      kind: "tool",
      tool_name: toolCall.tool_name,
      arguments: {},
      status: "complete",
      locked: true,
      created_at: baseTime + 1000 + index,
    };
    blocks.push(tool);
  });

  const response = agent.agent_response?.trim();
  if (response) {
    const text: TextBlock = {
      id: `v1-text-${agent.name}`,
      kind: "text",
      format: "markdown-lite",
      content: response,
      status: "complete",
      locked: true,
      created_at: baseTime + 2000,
    };
    blocks.push(text);
  }

  return blocks;
}

/** Convert a v1 trace agent row into a v2 AgentGroup. */
export function parsedAgentToGroup(agent: ParsedAgentTrace): AgentGroup {
  return {
    id: `v1-group-${agent.name}`,
    agentName: agent.name,
    displayName: getAgentDisplayName(agent.name),
    role: resolveRole(agent.name),
    blocks: parsedAgentToBlocks(agent),
  };
}
