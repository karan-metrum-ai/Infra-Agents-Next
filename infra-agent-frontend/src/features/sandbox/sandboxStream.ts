/**
 * SSE client for a single sandbox run.
 *
 * `GET /v1/sandbox/runs/:runId/stream` doesn't fit RTK Query's
 * request/response model — same reasoning documented in
 * `src/components/QueryTrace/flowStreamApi.ts` and `src/features/kyai/
 * kyaiApi.ts` for their own SSE endpoints. Kept as a plain function,
 * co-located with `sandboxApi.ts` (not under `src/components/SandboxPanel/`)
 * because, unlike QueryTrace's REST client, the Sandbox feature's RTK
 * Query API already lives under `src/features/sandbox/` — this SSE client
 * shares the same base path and event vocabulary as those endpoints, so
 * keeping the feature's whole network surface in one directory is the
 * smaller-indirection choice here.
 *
 * Ported from the Vite app's `lib/sandboxApi.ts` `subscribeToRun`.
 */

import type { SandboxSseEvent } from "./sandboxApi.types";

const SANDBOX_API_BASE = "/sandbox-api";

const SANDBOX_SSE_EVENT_TYPES = [
  "phase_started",
  "phase_completed",
  "phase_failed",
  "query_scored",
  "metric_update",
  "report_ready",
  "run_completed",
  "run_failed",
  "run_cancelled",
  "run_timeout",
] as const;

export interface SandboxSseSubscription {
  close: () => void;
}

/**
 * Subscribe to SSE events for a sandbox run. Returns a subscription handle
 * with a `close()` method; the caller is responsible for calling it on
 * cleanup (unmount, `runId` change, or falling back to polling).
 */
export function subscribeToRun(
  runId: string,
  onEvent: (event: SandboxSseEvent) => void,
  onError?: (error: Event) => void,
  lastEventId?: number,
): SandboxSseSubscription {
  let url = `${SANDBOX_API_BASE}/v1/sandbox/runs/${runId}/stream`;
  if (lastEventId !== undefined && lastEventId > 0) {
    url += `?last_event_id=${lastEventId}`;
  }

  const source = new EventSource(url);

  for (const type of SANDBOX_SSE_EVENT_TYPES) {
    source.addEventListener(type, (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data as string) as SandboxSseEvent;
        onEvent(parsed);
      } catch {
        /* ignore parse errors */
      }
    });
  }

  source.addEventListener("error", (e) => {
    onError?.(e);
  });

  return {
    close: () => source.close(),
  };
}
