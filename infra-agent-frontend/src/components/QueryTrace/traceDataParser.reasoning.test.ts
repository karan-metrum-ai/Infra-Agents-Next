import { describe, expect, it } from "vitest";
import { parseTraceData } from "./traceDataParser";

describe("parseTraceData reasoning normalization", () => {
  it("collapses tokenized reasoning from completed REST snapshots", () => {
    const raw = {
      trace: [
        {
          name: "operations_manager",
          query: "health report",
          agent_response: "Done",
          reasoning_content: [
            "The",
            "",
            "user",
            "wants",
            "a",
            "",
            "health",
            "report",
            "for",
            "the",
            "last",
            "25",
            "days",
            "",
            "The user wants a health report for the last 25 days.",
          ].join("\n"),
          created_at: "2026-06-11T10:40:49.110786",
          completed_at: "2026-06-11T10:47:56.454942",
          status: "completed",
        },
      ],
    };

    const result = parseTraceData(raw);
    expect(result.agents[0].reasoning_content).toHaveLength(1);
    expect(result.agents[0].reasoning_content[0]).toBe(
      "The user wants a health report for the last 25 days.",
    );
  });
});
