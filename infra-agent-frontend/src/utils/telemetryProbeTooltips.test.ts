import { describe, it, expect } from "vitest";
import {
  buildAggregateTooltip,
  buildStreamTooltip,
  formatProbeAge,
} from "./telemetryProbeTooltips";
import type { DeviceTelemetryProbes } from "@/schemas/telemetryProbe.schema";

const flowingProbe = {
  status: "flowing" as const,
  last_seen_at: "2026-07-07T11:30:00.000Z",
  source: "idrac",
  age_seconds: 42,
};

const staleOsProbe = {
  status: "stale" as const,
  last_seen_at: "2026-07-07T11:22:00.000Z",
  source: "node_agent",
  age_seconds: 480,
};

const missingProbe = {
  status: "missing" as const,
  last_seen_at: null,
  source: "node_agent",
  age_seconds: null,
};

describe("telemetryProbeTooltips", () => {
  it("formats age from age_seconds", () => {
    expect(formatProbeAge(null, 42)).toBe("42s ago");
    expect(formatProbeAge(null, 8 * 60)).toBe("8m ago");
  });

  it("builds per-stream tooltip for stale OS", () => {
    const tip = buildStreamTooltip("os", staleOsProbe);
    expect(tip).toContain("OS (node-agent)");
    expect(tip).toContain("Stale");
    expect(tip).toContain("Expected every 30s");
  });

  it("builds aggregate tooltip calling out stale OS", () => {
    const probes: DeviceTelemetryProbes = { bmc: flowingProbe, os: staleOsProbe };
    const tip = buildAggregateTooltip(probes);
    expect(tip).toContain("Telemetry streams");
    expect(tip).toContain("Stale: OS metrics");
    expect(tip).toContain("BMC (iDRAC): Live");
  });

  it("builds aggregate tooltip for all streams live", () => {
    const probes: DeviceTelemetryProbes = {
      bmc: flowingProbe,
      os: { ...flowingProbe, source: "node_agent" },
    };
    const tip = buildAggregateTooltip(probes);
    expect(tip).toContain("All streams live");
  });

  it("builds aggregate tooltip for missing OS", () => {
    const probes: DeviceTelemetryProbes = { bmc: flowingProbe, os: missingProbe };
    const tip = buildAggregateTooltip(probes);
    expect(tip).toContain("Missing: OS metrics");
  });
});
