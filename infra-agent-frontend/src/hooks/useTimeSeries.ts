"use client";

import { useEffect, useMemo, useState } from "react";
import { useGetDeviceTimeseriesQuery } from "@/features/digitalTwin/digitalTwinApi";
import type { TimeSeriesPoint } from "@/features/digitalTwin/digitalTwinApi.types";

/** Pre-defined time window options shown in the range selector. */
export const TIME_WINDOWS = [
  { label: "10m", ms: 10 * 60 * 1000 },
  { label: "1h", ms: 60 * 60 * 1000 },
  { label: "6h", ms: 6 * 60 * 60 * 1000 },
  { label: "24h", ms: 24 * 60 * 60 * 1000 },
  { label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
] as const;

export type TimeWindowLabel = (typeof TIME_WINDOWS)[number]["label"];

interface UseTimeSeriesArgs {
  deviceId: number;
  /** Cluster ID — tenant isolation key. Query skipped when falsy. */
  clusterId: number | null | undefined;
  metric: string;
  window?: TimeWindowLabel;
  fromMs?: number;
  toMs?: number;
  aggregation?: string;
  /** Polling interval in ms. Default: 60000 (1 min). */
  pollingIntervalMs?: number;
}

interface UseTimeSeriesResult {
  points: TimeSeriesPoint[];
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  downsampled: boolean;
  cacheHit: boolean;
  refetch: () => void;
}

/**
 * Wraps `useGetDeviceTimeseriesQuery` with tenant isolation defaults and a
 * convenience API for the time-range selector.
 *
 * `tick` advances once per polling cycle so the from/to window stays current
 * (not frozen at mount) — RTK's own `pollingInterval` is intentionally not
 * used since the window itself, not just the cache entry, needs refreshing.
 */
export function useTimeSeries({
  deviceId,
  clusterId,
  metric,
  window = "1h",
  fromMs,
  toMs,
  aggregation = "avg",
  pollingIntervalMs = 60_000,
}: UseTimeSeriesArgs): UseTimeSeriesResult {
  const windowMs = useMemo(
    () => TIME_WINDOWS.find((w) => w.label === window)?.ms ?? 60 * 60 * 1000,
    [window],
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), pollingIntervalMs);
    return () => clearInterval(id);
  }, [pollingIntervalMs]);

  const resolvedFrom = useMemo(
    () => fromMs ?? Date.now() - windowMs,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fromMs, windowMs, tick],
  );
  const resolvedTo = useMemo(
    () => toMs ?? Date.now(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toMs, tick],
  );

  const skip = !clusterId || !metric || !deviceId;

  const { data, isLoading, isError, isFetching, refetch } = useGetDeviceTimeseriesQuery(
    {
      deviceId,
      clusterId: clusterId ?? 0,
      metric,
      fromMs: resolvedFrom,
      toMs: resolvedTo,
      aggregation,
    },
    { skip, refetchOnMountOrArgChange: true },
  );

  return {
    points: data?.points ?? [],
    isLoading,
    isError,
    isFetching,
    downsampled: data?.downsampled ?? false,
    cacheHit: data?.cache_hit ?? false,
    refetch,
  };
}
