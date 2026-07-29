import { describe, expect, it } from "vitest";
import {
  isTerminalFlowListStatus,
  looksLikeDelegatedTaskGoal,
  mergeFlowListItems,
  mergeFlowListQuery,
  mergeFlowListStatus,
} from "./flowListMerge";
import type { FlowListItem } from "./flowPayload.types";

const baseFlow = (overrides: Partial<FlowListItem> = {}): FlowListItem => ({
  session_id: "sess-1",
  correlation_id: "corr-1",
  query: "What is the CPU load?",
  status: "completed",
  created_at: "2026-07-07T10:00:00Z",
  completed_at: "2026-07-07T10:01:00Z",
  score: null,
  ...overrides,
});

describe("flowListMerge", () => {
  it("detects delegated task goal copy", () => {
    expect(
      looksLikeDelegatedTaskGoal("Collect CPU metrics for host x (execution_mode=direct_metrics)"),
    ).toBe(true);
    expect(looksLikeDelegatedTaskGoal("What is the CPU load?")).toBe(false);
  });

  it("does not downgrade completed status on poll merge", () => {
    expect(mergeFlowListStatus("completed", "pending")).toBe("completed");
    expect(mergeFlowListStatus("completed", "active")).toBe("completed");
  });

  it("upgrades active status to completed from incoming", () => {
    expect(mergeFlowListStatus("processing", "completed")).toBe("completed");
  });

  it("prefers completed when existing has completed_at", () => {
    expect(mergeFlowListStatus("pending", "active", "2026-07-07T10:01:00Z", null)).toBe(
      "completed",
    );
  });

  it("preserves user query over delegated task goal", () => {
    expect(
      mergeFlowListQuery(
        "What is the CPU load on host x?",
        "Collect CPU metrics for host x (execution_mode=direct_metrics)",
      ),
    ).toBe("What is the CPU load on host x?");
  });

  it("mergeFlowListItems keeps terminal status and user query", () => {
    const existing = baseFlow();
    const incoming = baseFlow({
      query: "Collect CPU metrics for host x (execution_mode=direct_metrics)",
      status: "pending",
      completed_at: null,
    });
    const merged = mergeFlowListItems(existing, incoming);
    expect(merged.status).toBe("completed");
    expect(merged.query).toBe("What is the CPU load?");
    expect(merged.completed_at).toBe("2026-07-07T10:01:00Z");
  });

  it("isTerminalFlowListStatus recognizes terminal values", () => {
    expect(isTerminalFlowListStatus("completed")).toBe(true);
    expect(isTerminalFlowListStatus("failed")).toBe(true);
    expect(isTerminalFlowListStatus("pending")).toBe(false);
  });
});
