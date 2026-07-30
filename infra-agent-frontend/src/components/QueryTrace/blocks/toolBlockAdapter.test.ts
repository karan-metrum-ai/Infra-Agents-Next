import { describe, expect, it } from "vitest";
import { toolBlockToToolCall } from "./toolBlockAdapter";
import type { ToolBlock } from "../blockStream/types";

describe("toolBlockToToolCall", () => {
  it("maps a completed tool block to terminal tool-call shape", () => {
    const block: ToolBlock = {
      id: "tool-1",
      kind: "tool",
      tool_name: "escalate_to_operations_manager",
      arguments: { reason: "needs approval" },
      output: "Escalated successfully",
      status: "complete",
      locked: true,
      created_at: Date.now() - 2500,
    };

    const toolCall = toolBlockToToolCall(block);

    expect(toolCall.tool_name).toBe("escalate_to_operations_manager");
    expect(toolCall.status).toBe("completed");
    expect(toolCall.args).toEqual({ reason: "needs approval" });
    expect(toolCall.result).toBe("Escalated successfully");
    expect(toolCall.duration_ms).toBeGreaterThan(0);
  });
});
