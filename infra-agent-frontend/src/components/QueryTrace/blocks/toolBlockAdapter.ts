import type { ToolBlock } from "../blockStream/types";

/**
 * Legacy v1 terminal tool-call shape (mirrors Vite's
 * `components/QueryTrace/agentTrace/types.ts` `ToolCall`). `agentTrace/`
 * itself is a separate, not-yet-ported rendering path (out of this
 * Phase 8 slice's scope — the `blocks/*` v2 renderer) whose only
 * consumer of this adapter (`AgentSection.tsx`) lives there. Defined
 * locally so this file's pure conversion logic + test can be ported
 * now, per the file list; reconcile with the real `agentTrace/types.ts`
 * port instead of keeping two definitions when that path lands.
 */
export interface ToolCall {
  tool_name: string;
  status?: "pending" | "running" | "completed" | "error" | string;
  args?: Record<string, unknown>;
  result?: string;
  duration_ms?: number;
}

/** Map a v2 tool block onto the v1 terminal tool-call shape. */
export function toolBlockToToolCall(block: ToolBlock): ToolCall {
  let status: ToolCall["status"] = "completed";
  if (block.status === "streaming" || block.status === "pending") {
    status = "running";
  } else if (block.status === "failed") {
    status = "error";
  }

  const durationMs =
    block.locked || block.status === "complete"
      ? Math.max(0, Date.now() - block.created_at)
      : undefined;

  return {
    tool_name: block.tool_name,
    status,
    args: block.arguments,
    result: block.output,
    duration_ms: durationMs,
  };
}

/** Map a v1 legacy tool call onto the v2 block shape so it can render
 * through the single `ToolBlock` component regardless of which trace
 * renderer (live v2 stream or replayed v1 trace) produced it. */
export function toolCallToBlockShape(
  toolCall: ToolCall,
  index: number,
  streaming: boolean,
): ToolBlock {
  let status: ToolBlock["status"] = "pending";
  const s = toolCall.status;
  if (s === "running" || s === "pending") {
    status = "streaming";
  } else if (s === "completed") {
    status = "complete";
  } else if (s === "error") {
    status = "failed";
  }
  if (!streaming && status === "streaming") {
    status = "complete";
  }

  return {
    id: `v1-tool-${index}-${toolCall.tool_name}`,
    kind: "tool",
    status,
    locked: status !== "streaming" && status !== "pending",
    created_at: Date.now() - (toolCall.duration_ms ?? 0),
    tool_name: toolCall.tool_name,
    arguments: toolCall.args ?? {},
    output: toolCall.result,
  };
}
