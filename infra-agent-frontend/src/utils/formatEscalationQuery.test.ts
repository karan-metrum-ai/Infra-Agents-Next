import { describe, expect, it } from "vitest";
import { formatEscalationQuery } from "./formatEscalationQuery";

const SAMPLE_HANDOFF = `[FROM_LEVEL1_SUPPORT] [FROM_LEVEL1_SUPPORT] LATENCY_CONTROLLER (RC-3: I/O Saturation) detected on infra-agents-r7625-01. NVMe SSD (Dell BOSS-N1, 960 GB, serial CN0WW56VFCP0037601E9) shows elevated read latency and sustained high disk utilization with critical event log entries for fatal PCIe bus errors (bus 225 dev 0 func 0, bus 224 dev 1 func 1, slot 7), confirming a queue-depth breach / I/O saturation event. Raw metrics: - Device: nvme0 — Dell BOSS-N1, 960 GB - Overall health: HEALTHY, controller live/OK - Temperatures: 41.85°C / 27.85°C / 30.85°C (all OK) - PCIe AER counters: 0 correctable, 0 non-fatal, 0 fatal - Queue depth: Confirmed breach triggering I/O saturation classification (RC-3) - User-reported: Elevated read latency and sustained high disk utilization Critical error logs: - Critical: A fatal error was detected on a component at bus 225 device 0 function 0. - Critical: A fatal error was detected on a component at bus 224 device 1 function 1. - Critical: A bus fatal error was detected on a component at slot 7. Root cause (verbatim from KB): RC-3: I/O Saturation (Write Buffer, Read, or Deep-Queue). Offered load exceeds what the drive can service, so requests queue and per-I/O latency climbs. Remediation is workload-side (throttle/redistribute the I/O, or move to a higher-throughput device) rather than firmware/hardware. Recommended actions (verbatim from KB): 1. Confirm saturation: fetch in-flight I/O queue depth (queue_depth_inflight) via diskstats performance tool. 2. I/O saturation detected — throttle or redistribute the workload to reduce in-flight I/O. 3. Consider moving to a higher-throughput device if workload cannot be reduced. Signal: event_log_critical Incident: INC0010156 Recommended action: ssd_remediation — delegate to storage_agent`;

describe("formatEscalationQuery", () => {
  it("maps duplicate FROM_LEVEL1_SUPPORT tags to a single Level 1 Support label", () => {
    const result = formatEscalationQuery(SAMPLE_HANDOFF);
    expect(result).toContain("@ **Level 1 Support**");
    expect(result).not.toMatch(/FROM_LEVEL1_SUPPORT/i);
    expect(result.match(/@ \*\*Level 1 Support\*\*/g)?.length).toBe(1);
  });

  it("splits wall-of-text into Summary, metrics, logs, root cause, and actions", () => {
    const result = formatEscalationQuery(SAMPLE_HANDOFF);
    expect(result).toContain("### Summary");
    expect(result).toContain("LATENCY_CONTROLLER (RC-3: I/O Saturation)");
    expect(result).toContain("### Raw Metrics");
    expect(result).toContain("- Device: nvme0");
    expect(result).toContain("- Overall health: HEALTHY");
    expect(result).toContain("### Critical Error Logs");
    expect(result).toContain("- Critical: A fatal error was detected");
    expect(result).toContain("### Root Cause");
    expect(result).toContain("RC-3: I/O Saturation");
    expect(result).toContain("### Recommended Actions");
    expect(result).toContain("1. Confirm saturation:");
    expect(result).toContain("2. I/O saturation detected");
    expect(result).toContain("3. Consider moving");
  });

  it("extracts trailing Signal / Incident / Recommended action into Details", () => {
    const result = formatEscalationQuery(SAMPLE_HANDOFF);
    expect(result).toContain("### Details");
    expect(result).toContain("- **Signal:** event_log_critical");
    expect(result).toContain("- **Incident:** INC0010156");
    expect(result).toContain(
      "- **Recommended action:** ssd_remediation — delegate to storage_agent",
    );
  });

  it("fences trailing JSON blob", () => {
    const withJson =
      `${SAMPLE_HANDOFF} ` + `{"triage_id":"TRG-2026-001847","host":"infra-agents-r7625-01"}`;
    const result = formatEscalationQuery(withJson);
    expect(result).toContain("```json");
    expect(result).toContain('"triage_id": "TRG-2026-001847"');
    expect(result).toContain('"host": "infra-agents-r7625-01"');
  });

  it("leaves plain short queries unchanged", () => {
    const plain = "Check SSD health on infra-agents-r7625-01";
    expect(formatEscalationQuery(plain)).toBe(plain);
  });

  it("returns empty string for empty input", () => {
    expect(formatEscalationQuery("")).toBe("");
    expect(formatEscalationQuery("   ")).toBe("");
  });

  it("maps legacy NOC_ANALYST tag to Level 1 Support", () => {
    const result = formatEscalationQuery(
      "[FROM_NOC_ANALYST] Device offline. Raw metrics: - cpu: 90%",
    );
    expect(result).toContain("@ **Level 1 Support**");
    expect(result).toContain("### Raw Metrics");
    expect(result).toContain("- cpu: 90%");
  });
});
