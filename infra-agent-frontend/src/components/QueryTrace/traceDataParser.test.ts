import { describe, it, expect } from "vitest";
import {
  capitalizeQueryText,
  parseUTCTimestamp,
  formatDuration,
  parseTraceData,
  getAgentDisplayName,
  getAgentColor,
} from "./traceDataParser";

describe("parseUTCTimestamp", () => {
  it("returns 0 for falsy input", () => {
    expect(parseUTCTimestamp("")).toBe(0);
    expect(parseUTCTimestamp(0)).toBe(0);
  });

  it("returns numeric timestamp as-is", () => {
    expect(parseUTCTimestamp(1700000000000)).toBe(1700000000000);
  });

  it("parses numeric string above threshold", () => {
    expect(parseUTCTimestamp("1700000000000")).toBe(1700000000000);
  });

  it("parses ISO string with Z", () => {
    const ts = "2026-04-13T12:00:00Z";
    const result = parseUTCTimestamp(ts);
    expect(result).toBe(new Date(ts).getTime());
  });

  it("parses ISO string without Z (appends Z)", () => {
    const ts = "2026-04-13T12:00:00";
    const result = parseUTCTimestamp(ts);
    expect(result).toBe(new Date("2026-04-13T12:00:00Z").getTime());
  });

  it("returns 0 for unparseable string", () => {
    expect(parseUTCTimestamp("not-a-date")).toBe(0);
  });
});

describe("capitalizeQueryText", () => {
  it("capitalizes the first character", () => {
    expect(capitalizeQueryText("can you check server health")).toBe("Can you check server health");
  });

  it("returns empty string for blank input", () => {
    expect(capitalizeQueryText("   ")).toBe("");
  });
});

describe("formatDuration", () => {
  it('returns "0ms" for zero', () => {
    expect(formatDuration(0)).toBe("0ms");
  });

  it('returns "Starting..." for zero when in progress', () => {
    expect(formatDuration(0, true)).toBe("Starting...");
  });

  it("formats milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("formats seconds", () => {
    expect(formatDuration(3000)).toBe("3s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125000)).toBe("2m 5s");
  });

  it('appends "(running)" when in progress', () => {
    expect(formatDuration(3000, true)).toBe("3s (running)");
  });

  it("handles negative duration by returning 0ms", () => {
    expect(formatDuration(-5000)).toBe("0ms");
  });

  it("handles NaN", () => {
    expect(formatDuration(NaN)).toBe("0ms");
  });
});

describe("getAgentDisplayName", () => {
  it("returns mapped name for known agents", () => {
    expect(getAgentDisplayName("operations_manager_agent")).toBe("Operations Manager");
    expect(getAgentDisplayName("level1_support")).toBe("Level 1 Support");
    expect(getAgentDisplayName("wlan_network_specialist")).toBe("WLAN Network Specialist");
  });

  it("converts snake_case to Title Case for unknown", () => {
    expect(getAgentDisplayName("custom_agent_name")).toBe("Custom Agent Name");
  });

  it("uppercases known acronyms", () => {
    expect(getAgentDisplayName("api_agent")).toBe("API Agent");
    expect(getAgentDisplayName("dns_checker")).toBe("DNS Checker");
  });
});

describe("getAgentColor", () => {
  it("returns the primary token for operations_manager", () => {
    expect(getAgentColor("operations_manager_agent")).toBe("var(--primary-500)");
  });

  it("returns a secondary token for wlan", () => {
    expect(getAgentColor("wlan_network_specialist")).toBe("var(--secondary-400)");
  });

  it("returns the success token for noc/level1 support", () => {
    expect(getAgentColor("level1_support")).toBe("var(--success-500)");
  });

  it("returns the accent token for hardware", () => {
    expect(getAgentColor("hardware_ops")).toBe("var(--accent-500)");
  });

  it("returns the danger token for operating", () => {
    expect(getAgentColor("operating_system_mgmt")).toBe("var(--danger-500)");
  });

  it("returns the neutral token for unknown", () => {
    expect(getAgentColor("random_agent")).toBe("var(--neutral-500)");
  });
});

describe("parseTraceData", () => {
  it("returns empty for null input", () => {
    const result = parseTraceData(null);
    expect(result.agents).toHaveLength(0);
    expect(result.total_duration_ms).toBe(0);
  });

  it("returns empty for empty array", () => {
    const result = parseTraceData([]);
    expect(result.agents).toHaveLength(0);
  });

  it("parses direct array format (old API)", () => {
    const raw = [
      {
        name: "agent_a",
        query: "check health",
        agent_response: "all good",
        reasoning_content: "",
        created_at: "2026-04-13T12:00:00Z",
        completed_at: "2026-04-13T12:00:05Z",
        status: "completed",
        tool_calls: [],
      },
    ];
    const result = parseTraceData(raw);
    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe("agent_a");
    expect(result.agents[0].duration_ms).toBeGreaterThan(0);
  });

  it("parses object format (new API) with trace key", () => {
    const raw = {
      correlation_id: "c-1",
      trace: [
        {
          name: "agent_b",
          query: "restart",
          agent_response: "done",
          reasoning_content: "",
          created_at: "2026-04-13T12:00:00Z",
          completed_at: "2026-04-13T12:00:03Z",
          status: "completed",
        },
      ],
    };
    const result = parseTraceData(raw);
    expect(result.agents).toHaveLength(1);
  });

  it("extracts final_response object", () => {
    const raw = [
      {
        final_response: {
          content: "Summary",
          created_at: "2026-04-13T12:00:00Z",
          completed_at: "2026-04-13T12:00:10Z",
          status: "completed",
        },
      },
    ];
    const result = parseTraceData(raw);
    expect(result.final_response?.content).toBe("Summary");
  });

  it("handles Unix timestamp format", () => {
    const now = Date.now();
    const raw = [
      {
        name: "agent_c",
        query: "q",
        agent_response: "r",
        reasoning_content: "",
        created_at: now - 5000,
        completed_at: now,
        status: "completed",
      },
    ];
    const result = parseTraceData(raw);
    expect(result.agents[0].duration_ms).toBeCloseTo(5000, -2);
  });
});
