/**
 * TelemetryProbesRow — dual BMC / OS liveness indicators.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { TelemetryProbe, TelemetryProbeStatus } from "@/schemas/telemetryProbe.schema";
import {
  buildAggregateTooltip,
  buildStreamTooltip,
  formatProbeAge,
} from "@/utils/telemetryProbeTooltips";
import styles from "./TelemetryProbesRow.module.css";
import type { TelemetryProbesRowProps } from "./TelemetryProbesRow.types";

const STATUS_LABEL: Record<TelemetryProbeStatus, string> = {
  flowing: "Live",
  stale: "Stale",
  missing: "No data",
};

const DOT_CLASS: Record<TelemetryProbeStatus, string> = {
  flowing: styles.dotFlowing,
  stale: styles.dotStale,
  missing: styles.dotMissing,
};

const META_CLASS: Record<TelemetryProbeStatus, string> = {
  flowing: styles.metaFlowing,
  stale: styles.metaStale,
  missing: styles.metaMissing,
};

interface ProbeItemProps {
  shortLabel: string;
  probe: TelemetryProbe;
  tooltip: string;
}

function ProbeItem({ shortLabel, probe, tooltip }: ProbeItemProps) {
  const age = formatProbeAge(probe.last_seen_at, probe.age_seconds);
  const statusLabel = STATUS_LABEL[probe.status];
  const metaText = age ? `${statusLabel} · ${age}` : statusLabel;

  return (
    <span title={tooltip} className={styles.item}>
      <span className={cn(styles.dot, DOT_CLASS[probe.status])} />
      <span className={styles.streamLabel}>{shortLabel}</span>
      <span className={cn(styles.meta, META_CLASS[probe.status])}>{metaText}</span>
    </span>
  );
}

/**
 * Renders BMC and OS telemetry probe indicators with hover tooltips.
 */
export function TelemetryProbesRow({ probes, className }: TelemetryProbesRowProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  // Recomputed every render (including the 10s tick above) so relative
  // "age" text stays fresh even when `probes` itself hasn't changed.
  const aggregateTooltip = buildAggregateTooltip(probes);
  const bmcTooltip = buildStreamTooltip("bmc", probes.bmc);
  const osTooltip = buildStreamTooltip("os", probes.os);

  return (
    <span className={cn(styles.row, className)} title={aggregateTooltip}>
      <ProbeItem shortLabel="BMC" probe={probes.bmc} tooltip={bmcTooltip} />
      <span className={styles.divider} aria-hidden="true" />
      <ProbeItem shortLabel="OS" probe={probes.os} tooltip={osTooltip} />
    </span>
  );
}
