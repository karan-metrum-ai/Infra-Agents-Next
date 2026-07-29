import { describe, expect, it } from "vitest";
import { deriveFlowLifecycleStatus, deriveTracePanelStatus } from "./deriveTraceStatus";

describe("deriveFlowLifecycleStatus", () => {
  it("treats approved plan as executing even when queryStatus is pending_approval", () => {
    expect(
      deriveFlowLifecycleStatus({
        queryStatus: "pending_approval",
        planStatus: "approved",
        blockPhase: "executing",
      }),
    ).toBe("executing");
  });

  it("returns awaiting_approval only before plan approval", () => {
    expect(
      deriveFlowLifecycleStatus({
        queryStatus: "pending_approval",
        planStatus: "pending",
        blockPhase: "interruption_awaited",
      }),
    ).toBe("awaiting_approval");
  });

  it("returns completed when block phase is completed", () => {
    expect(
      deriveFlowLifecycleStatus({
        queryStatus: "executing",
        planStatus: "executing",
        blockPhase: "completed",
      }),
    ).toBe("completed");
  });
});

describe("deriveTracePanelStatus", () => {
  it("prefers completed queryStatus over executing planStatus", () => {
    expect(
      deriveTracePanelStatus({
        planStatus: "executing",
        queryStatus: "completed",
        phase: "planning",
        hasStreamingBlocks: false,
      }),
    ).toBe("completed");
  });

  it("returns completed when phase is completed", () => {
    expect(
      deriveTracePanelStatus({
        planStatus: "executing",
        queryStatus: "executing",
        phase: "completed",
        hasStreamingBlocks: false,
      }),
    ).toBe("completed");
  });

  it("returns completed when all blocks are terminal", () => {
    expect(
      deriveTracePanelStatus({
        planStatus: "approved",
        queryStatus: "executing",
        phase: "executing",
        hasBlocks: true,
        allBlocksTerminal: true,
        hasStreamingBlocks: false,
      }),
    ).toBe("completed");
  });

  it("returns in_progress while blocks are streaming", () => {
    expect(
      deriveTracePanelStatus({
        planStatus: "executing",
        queryStatus: "executing",
        phase: "executing",
        hasStreamingBlocks: true,
      }),
    ).toBe("in_progress");
  });

  it("returns pending_approval for awaiting decision", () => {
    expect(
      deriveTracePanelStatus({
        planStatus: "pending",
        queryStatus: "pending_approval",
      }),
    ).toBe("pending_approval");
  });

  it("returns in_progress when plan is approved but queryStatus is stale", () => {
    expect(
      deriveTracePanelStatus({
        planStatus: "approved",
        queryStatus: "pending_approval",
        phase: "executing",
        hasStreamingBlocks: true,
      }),
    ).toBe("in_progress");
  });

  it("defaults to processing when evidence is ambiguous", () => {
    expect(
      deriveTracePanelStatus({
        planStatus: undefined,
        queryStatus: undefined,
        phase: undefined,
        hasBlocks: false,
      }),
    ).toBe("processing");
  });
});
