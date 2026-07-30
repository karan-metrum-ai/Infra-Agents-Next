/**
 * Data model for the agent-segregated trace layout (v1 legacy renderer).
 *
 * AgentNode is the recursive tree node that powers the nested
 * agent rendering. Built from ParsedAgentTrace via buildAgentTree.
 */

export type AgentRole = "manager" | "level1" | "specialist";

export interface ToolCall {
  tool_name: string;
  status?: "pending" | "running" | "completed" | "error" | string;
  args?: Record<string, unknown>;
  result?: string;
  duration_ms?: number;
}

export interface AgentNode {
  id: string;
  name: string;
  displayName: string;
  role: AgentRole;
  query?: string;
  reasoning: string[];
  toolCalls: ToolCall[];
  response: string;
  status?: string;
  createdAt?: string;
  completedAt?: string | null;
  durationMs?: number;
  children: AgentNode[];
}
