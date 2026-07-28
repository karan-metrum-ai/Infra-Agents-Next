/**
 * FreshnessBadge — compact indicator of telemetry data age.
 *
 * Shows real-time, stale, or unknown based on the `data_freshness` field
 * from the API and the absolute `last_telemetry_timestamp`.
 */

"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./FreshnessBadge.module.css";
import type { FreshnessBadgeProps } from "./FreshnessBadge.types";

type FreshnessState = "real-time" | "stale" | "unknown";

function parseFreshness(raw: string): FreshnessState {
  const lower = (raw ?? "").toLowerCase();
  if (lower === "real-time" || lower === "realtime") return "real-time";
  if (lower === "stale") return "stale";
  return "unknown";
}

function formatAge(isoTs: string | null | undefined): string {
  if (!isoTs) return "";
  const now = Date.now();
  const ts = new Date(isoTs).getTime();
  if (Number.isNaN(ts)) return "";
  const diffS = Math.floor((now - ts) / 1000);
  if (diffS < 5) return "just now";
  if (diffS < 60) return `${diffS}s ago`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  return `${diffH}h ago`;
}

const CONFIG: Record<FreshnessState, { label: string; stateClass: string; Icon: typeof Activity }> =
  {
    "real-time": { label: "Live", stateClass: styles.stateRealTime, Icon: Activity },
    stale: { label: "Stale", stateClass: styles.stateStale, Icon: AlertTriangle },
    unknown: { label: "Unknown", stateClass: styles.stateUnknown, Icon: Clock },
  };

/**
 * Displays telemetry freshness inline, updating the relative age label
 * every 10 seconds.
 */
export function FreshnessBadge({
  dataFreshness,
  lastTelemetryTimestamp,
  className,
}: FreshnessBadgeProps) {
  const [age, setAge] = useState<string>(() => formatAge(lastTelemetryTimestamp));

  useEffect(() => {
    setAge(formatAge(lastTelemetryTimestamp));
    const id = setInterval(() => setAge(formatAge(lastTelemetryTimestamp)), 10_000);
    return () => clearInterval(id);
  }, [lastTelemetryTimestamp]);

  const state = parseFreshness(dataFreshness);
  const { label, stateClass, Icon } = CONFIG[state];

  return (
    <span
      className={cn(styles.badge, stateClass, className)}
      title={
        lastTelemetryTimestamp
          ? `Last telemetry: ${lastTelemetryTimestamp}`
          : "No telemetry timestamp"
      }
    >
      <Icon size={9} aria-hidden="true" />
      {label}
      {age && <span className={styles.age}>&nbsp;·&nbsp;{age}</span>}
    </span>
  );
}
