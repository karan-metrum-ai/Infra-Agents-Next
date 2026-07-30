import { describe, expect, it } from "vitest";
import { resolveFlowDisplayQuery } from "./resolveFlowDisplayQuery";

describe("resolveFlowDisplayQuery", () => {
  it("prefers plan bundle query over delegated task goal in list row", () => {
    const result = resolveFlowDisplayQuery(
      {
        query: "Collect CPU metrics for host x (execution_mode=direct_metrics)",
      },
      {
        planBundle: {
          correlation_id: "c1",
          session_id: "s1",
          query: "What is the CPU load on host x?",
          dag_export: { dag_id: "d1", nodes: [], edges: [] },
          verification_result: {
            is_valid: true,
            overall_score: 1,
            node_scores: {},
          },
          status: "completed",
          created_at: "2026-07-07T10:00:00Z",
        },
      },
    );
    expect(result).toBe("What is the CPU load on host x?");
  });

  it("uses active conversation query when present", () => {
    const result = resolveFlowDisplayQuery(null, {
      activeConversationQuery: "Show memory usage",
    });
    expect(result).toBe("Show memory usage");
  });
});
