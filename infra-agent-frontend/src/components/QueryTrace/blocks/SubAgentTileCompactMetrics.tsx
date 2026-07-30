"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/hooks/useAppSelector";
import {
  buildDeviceTriageMap,
  lookupDeviceTriage,
  parseSubAgentSummary,
} from "./subAgentTileUtils";
import type { SubAgentBlock } from "../blockStream/types";
import styles from "./blocks.module.css";

interface SubAgentTileCompactMetricsProps {
  block: SubAgentBlock;
}

function formatDurationMs(ms: number | undefined): string | null {
  if (ms == null || ms <= 0) {
    return null;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Single-row metrics strip shown when a parallel tile is expanded.
 *
 * Keeps the expanded card the same height as collapsed siblings.
 */
function SubAgentTileCompactMetrics({ block }: SubAgentTileCompactMetricsProps) {
  // `flowStream.flowData` is `FlowPayload` (a partial, pulled-forward
  // subset of the real backend shape) — the `sessions[].turns[].
  // structured_data.device_triage` path this reads is real backend
  // data not yet modeled on that type. The cast mirrors Vite's own
  // loosely-typed traversal here.
  const flowData = useAppSelector((s) => s.flowStream.flowData) as unknown as Record<
    string,
    unknown
  > | null;

  const triageMap = useMemo(() => buildDeviceTriageMap(flowData), [flowData]);
  const triage = useMemo(
    () => lookupDeviceTriage(triageMap, block.agent_name),
    [triageMap, block.agent_name],
  );
  const summary = useMemo(() => parseSubAgentSummary(block.content ?? ""), [block.content]);

  const status = triage?.status ?? summary?.status;
  const findings =
    summary?.findings ?? (triage?.findings?.length != null ? String(triage.findings.length) : null);
  const tools =
    summary?.tools ??
    (triage?.tool_calls?.length != null ? String(triage.tool_calls.length) : null);
  const duration = formatDurationMs(
    triage?.duration_ms ??
      (summary?.duration ? Number(summary.duration.replace(/\D/g, "")) : undefined),
  );

  const items = [
    status ? { label: "Status", value: status, tone: status.toLowerCase() } : null,
    findings ? { label: "Findings", value: findings } : null,
    tools ? { label: "Tools", value: tools } : null,
    duration ? { label: "Duration", value: duration } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; tone?: string }>;

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={styles.agentTileCompactMetrics}>
      {items.map((item) => (
        <div key={item.label} className={styles.agentTileCompactMetric}>
          <span className={styles.agentTileCompactMetricLabel}>{item.label}</span>
          <span className={styles.agentTileCompactMetricValue} data-status={item.tone}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default SubAgentTileCompactMetrics;
