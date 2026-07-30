import { describe, expect, it } from "vitest";
import type { Block } from "./blockStream/types";
import { computeShowV2Stream, selectTopLevelBlocks } from "./queryTraceV2Gating";

function toolBlock(id: string, parentId: string | null = null): Block {
  return {
    id,
    kind: "tool",
    tool_name: "check",
    arguments: {},
    status: "complete",
    parent_id: parentId,
    locked: true,
    created_at: 0,
  };
}

describe("queryTraceV2Gating", () => {
  it("shows v2 when blocks exist without requiring agent groups", () => {
    expect(
      computeShowV2Stream({
        isLegacyPlanInterruption: false,
        blockOrderLength: 2,
        blockCorrelationId: "flow-1",
        flowCorrelationId: "flow-1",
      }),
    ).toBe(true);
  });

  it("falls back to flat blocks when top-level filter would hide nested blocks", () => {
    const parent = toolBlock("parent", null);
    const child = toolBlock("child", "parent");
    const byId = { parent, child };

    expect(selectTopLevelBlocks([parent, child], byId).map((b) => b.id)).toEqual(["parent"]);
    expect(selectTopLevelBlocks([child], byId)).toEqual([child]);
  });

  it("hides v2 for legacy plan interruption flows", () => {
    expect(
      computeShowV2Stream({
        isLegacyPlanInterruption: true,
        blockOrderLength: 3,
        blockCorrelationId: "flow-1",
        flowCorrelationId: "flow-1",
      }),
    ).toBe(false);
  });

  it("hides v2 when block correlation does not match flow", () => {
    expect(
      computeShowV2Stream({
        isLegacyPlanInterruption: false,
        blockOrderLength: 3,
        blockCorrelationId: "flow-old",
        flowCorrelationId: "flow-new",
      }),
    ).toBe(false);
  });
});
