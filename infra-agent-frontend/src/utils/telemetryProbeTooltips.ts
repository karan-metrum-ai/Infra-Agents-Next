/**
 * Tooltip copy helpers for per-stream telemetry liveness probes.
 */

import type { DeviceTelemetryProbes, TelemetryProbe } from "@/schemas/telemetryProbe.schema";

const SOURCE_LABELS: Record<string, string> = {
  idrac: "iDRAC",
  redfish: "Redfish",
  node_agent: "node-agent",
};

const STREAM_LABELS = {
  bmc: "BMC",
  os: "OS",
} as const;

const EXPECTED_INTERVAL: Record<keyof typeof STREAM_LABELS, string> = {
  bmc: "60s",
  os: "30s",
};

export function formatProbeAge(
  lastSeenAt: string | null | undefined,
  ageSeconds: number | null | undefined,
): string {
  if (ageSeconds != null && ageSeconds >= 0) {
    if (ageSeconds < 5) return "just now";
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    const minutes = Math.floor(ageSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
  if (!lastSeenAt) return "";
  const ts = new Date(lastSeenAt).getTime();
  if (Number.isNaN(ts)) return "";
  const diffS = Math.floor((Date.now() - ts) / 1000);
  if (diffS < 5) return "just now";
  if (diffS < 60) return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  return `${Math.floor(diffM / 60)}h ago`;
}

function sourceLabel(source: string | null | undefined): string {
  if (!source) return "unknown";
  return SOURCE_LABELS[source] ?? source;
}

function statusLabel(status: TelemetryProbe["status"]): string {
  switch (status) {
    case "flowing":
      return "Live";
    case "stale":
      return "Stale";
    case "missing":
      return "No data";
    default:
      return "Unknown";
  }
}

export function buildStreamTooltip(
  stream: keyof typeof STREAM_LABELS,
  probe: TelemetryProbe,
): string {
  const streamLabel = STREAM_LABELS[stream];
  const src = sourceLabel(probe.source);
  const age = formatProbeAge(probe.last_seen_at, probe.age_seconds);
  const interval = EXPECTED_INTERVAL[stream];

  if (probe.status === "missing") {
    return `${streamLabel} (${src}): No data in last 10 minutes. Expected every ${interval}.`;
  }

  const tsPart = probe.last_seen_at ? ` (${probe.last_seen_at})` : "";
  return `${streamLabel} (${src}): ${statusLabel(probe.status)} — last sample ${age}${tsPart}. Expected every ${interval}.`;
}

function unhealthySummary(
  stream: keyof typeof STREAM_LABELS,
  probe: TelemetryProbe,
): string | null {
  if (probe.status === "flowing") return null;
  const label = stream === "bmc" ? "BMC metrics" : "OS metrics";
  if (probe.status === "stale") return `Stale: ${label}`;
  return `Missing: ${label}`;
}

export function buildAggregateTooltip(probes: DeviceTelemetryProbes): string {
  const bmcAge = formatProbeAge(probes.bmc.last_seen_at, probes.bmc.age_seconds);
  const osAge = formatProbeAge(probes.os.last_seen_at, probes.os.age_seconds);
  const bmcSrc = sourceLabel(probes.bmc.source);
  const osSrc = sourceLabel(probes.os.source);

  const lines = [
    "Telemetry streams",
    `• BMC (${bmcSrc}): ${statusLabel(probes.bmc.status)} — ${bmcAge || "n/a"}`,
    `• OS (${osSrc}): ${statusLabel(probes.os.status)} — ${osAge || "n/a"}`,
  ];

  const issues = [unhealthySummary("bmc", probes.bmc), unhealthySummary("os", probes.os)].filter(
    (item): item is string => item != null,
  );

  if (issues.length === 0) {
    lines.push("", "All streams live");
  } else {
    lines.push("", issues.join(" · "));
  }

  return lines.join("\n");
}
