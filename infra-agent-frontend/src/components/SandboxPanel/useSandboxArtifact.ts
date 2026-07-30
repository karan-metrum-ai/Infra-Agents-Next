"use client";

import { skipToken } from "@reduxjs/toolkit/query/react";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import {
  useGetArtifactQuery,
  useGetLogsQuery,
  useGetQueryRecordsQuery,
} from "@/features/sandbox/sandboxApi";
import type { SandboxLogsResponse } from "@/features/sandbox/sandboxApi.types";

export interface UseSandboxArtifactResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function rtkErrorMessage(error: FetchBaseQueryError | SerializedError, fallback: string): string {
  if ("message" in error && typeof error.message === "string") {
    return error.message;
  }
  if ("status" in error) {
    return `${fallback} (${String(error.status)})`;
  }
  return fallback;
}

/**
 * Lazy-loads a sandbox artifact payload, `skip`ping the request until the
 * consumer flips `enabled` (e.g. a tab becomes active).
 *
 * Ported from the Vite app's `hooks/useSandboxArtifact.ts` `useSandboxArtifact`.
 * The original hand-rolled its own fetch/abort/loading `useEffect`
 * (deps `[enabled, load]`, firing `load()` only when `enabled` flips
 * true) — that's exactly RTK Query's `skip` option, so this is converted
 * to RTK Query endpoints instead of porting the effect: `getQueryRecords`
 * for the `query_records.json` artifact (derived from the report's
 * `query_scores` field) and `getArtifact` for everything else, both
 * `skip`ped while `!enabled`. RTK Query's own cache/dedup/abort-on-
 * unsubscribe already covers everything the original's `AbortController`
 * ref did by hand.
 */
export function useSandboxArtifact<T = unknown>(
  runId: string | undefined,
  name: string | undefined,
  enabled: boolean,
): UseSandboxArtifactResult<T> {
  const isQueryRecords = name === "query_records.json";

  const queryRecords = useGetQueryRecordsQuery(
    enabled && runId && isQueryRecords ? runId : skipToken,
  );
  const artifact = useGetArtifactQuery(
    enabled && runId && name && !isQueryRecords ? { runId, name } : skipToken,
  );

  const active = isQueryRecords ? queryRecords : artifact;

  return {
    data: active.data !== undefined ? (active.data as T) : null,
    isLoading: active.isFetching,
    error: active.error ? rtkErrorMessage(active.error, "Failed to load") : null,
    refetch: () => {
      active.refetch();
    },
  };
}

/**
 * Fetches sandbox pod logs, `skip`ping the request until `enabled` flips
 * true. Ported from the Vite app's `useSandboxLogs` — same `skip`-based
 * conversion as `useSandboxArtifact` above; `getLogs` is itself a stub
 * `queryFn` with no real network call (see `sandboxApi.ts`), ported as-is.
 */
export function useSandboxLogs(
  runId: string | undefined,
  enabled: boolean,
): UseSandboxArtifactResult<SandboxLogsResponse> {
  const logs = useGetLogsQuery(enabled && runId ? runId : skipToken);

  return {
    data: logs.data ?? null,
    isLoading: logs.isFetching,
    error: logs.error ? rtkErrorMessage(logs.error, "Failed to load logs") : null,
    refetch: () => {
      logs.refetch();
    },
  };
}
