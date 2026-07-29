import { describe, expect, it } from "vitest";
import { hasActiveBlocks, isBlockActive, isBlockDone } from "./blockStatus";
import type { Block, BlockStoreState, ToolBlock } from "./types";

function toolBlock(overrides: Partial<ToolBlock> = {}): ToolBlock {
  return {
    id: "b1",
    kind: "tool",
    status: "streaming",
    locked: false,
    created_at: Date.now(),
    tool_name: "submit_for_approval",
    arguments: { description: "Executing Submit For Approval" },
    ...overrides,
  };
}

function snapshot(blocks: Block[], phase: BlockStoreState["phase"] = "executing"): BlockStoreState {
  return {
    version: 0,
    phase,
    order: blocks.map((b) => b.id),
    byId: Object.fromEntries(blocks.map((b) => [b.id, b])),
    active_block_id: null,
    todo_list: [],
    interruption: null,
    correlation_id: null,
    session_id: null,
    last_timestamp: null,
    aliases: {},
  };
}

describe("blockStatus", () => {
  it("treats locked streaming blocks as done, not active", () => {
    const block = toolBlock({ locked: true, status: "streaming" });
    expect(isBlockActive(block)).toBe(false);
    expect(isBlockDone(block)).toBe(true);
  });

  it("treats unlocked streaming blocks as active", () => {
    const block = toolBlock({ locked: false, status: "streaming" });
    expect(isBlockActive(block)).toBe(true);
    expect(isBlockDone(block)).toBe(false);
  });

  it("hasActiveBlocks ignores locked streaming blocks", () => {
    const store = snapshot([toolBlock({ locked: true, status: "streaming" })]);
    expect(hasActiveBlocks(store)).toBe(false);
  });

  it("hasActiveBlocks returns false when phase is completed", () => {
    const store = snapshot([toolBlock({ locked: false, status: "streaming" })], "completed");
    expect(hasActiveBlocks(store)).toBe(false);
  });
});
