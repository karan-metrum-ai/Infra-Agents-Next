import type { AppDispatch } from "@/store/store";
import { sandboxApi } from "@/features/sandbox/sandboxApi";
import { subscribeToRun, type SandboxSseSubscription } from "@/features/sandbox/sandboxStream";
import {
  isTerminal,
  type SandboxReport,
  type SandboxRun,
  type SandboxSseEvent,
} from "@/features/sandbox/sandboxApi.types";

const POLL_INTERVAL_MS = 5000;

const TERMINAL_EVENTS = new Set(["run_completed", "run_failed", "run_cancelled", "run_timeout"]);

export interface SandboxRunControllerCallbacks {
  onRun: (run: SandboxRun) => void;
  onReport: (report: SandboxReport) => void;
  onEvent: (event: SandboxSseEvent) => void;
  /** Fires once the very first fetch (success or failure) has settled. */
  onLoadingSettled: () => void;
  onError: (message: string | null) => void;
}

export interface SandboxRunController {
  start: () => void;
  stop: () => void;
}

/**
 * Owns the fetch → SSE → polling-fallback lifecycle for a single sandbox
 * run: initial `GET /runs/:runId`, then an SSE subscription for live
 * updates, falling back to 5s polling of the same GET if SSE errors. On
 * terminal SSE events (`run_completed/failed/cancelled/timeout`) or
 * `report_ready`, fetches the report.
 *
 * Ported from the Vite app's `hooks/useSandboxRun.ts` (219 LOC), split out
 * of the React hook so this control flow is framework-agnostic (plain
 * closures, no `useRef`/`useState`) and independently testable.
 * `useSandboxRunConnection` is the thin React wrapper that owns the one
 * sanctioned `useEffect` driving this controller's lifetime.
 *
 * Network calls go through `sandboxApi`'s RTK Query endpoints (`subscribe:
 * false, forceRefetch: true` — always hits the network and updates the
 * shared cache, without leaving a permanent subscription behind for every
 * poll tick) so any other component reading `useGetRunQuery`/
 * `useGetReportQuery` for the same id sees the same fresh data.
 */
export function createSandboxRunController(
  runId: string,
  dispatch: AppDispatch,
  callbacks: SandboxRunControllerCallbacks,
): SandboxRunController {
  let sse: SandboxSseSubscription | null = null;
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let aborted = false;
  let reportFetched = false;

  const clearPoll = () => {
    if (pollTimeout !== null) {
      clearTimeout(pollTimeout);
      pollTimeout = null;
    }
  };

  const fetchRunOnce = () =>
    dispatch(
      sandboxApi.endpoints.getRun.initiate(runId, { subscribe: false, forceRefetch: true }),
    ).unwrap();

  const fetchReportOnce = () =>
    dispatch(
      sandboxApi.endpoints.getReport.initiate(runId, { subscribe: false, forceRefetch: true }),
    ).unwrap();

  const loadReport = () => {
    if (reportFetched) return;
    reportFetched = true;
    fetchReportOnce()
      .then((report) => {
        if (!aborted) callbacks.onReport(report);
      })
      .catch(() => {
        reportFetched = false;
      });
  };

  /** Re-fetches run status without affecting the loading/SSE-vs-poll decision — used by SSE event handlers and the poll loop. */
  const refreshRun = () => {
    fetchRunOnce()
      .then((run) => {
        if (aborted) return;
        callbacks.onRun(run);
        callbacks.onError(null);
        if (run.status === "completed" && !reportFetched) loadReport();
      })
      .catch((err) => {
        if (!aborted) {
          callbacks.onError(err instanceof Error ? err.message : "Failed to fetch run");
        }
      });
  };

  const pollTick = () => {
    if (aborted) return;
    fetchRunOnce()
      .then((run) => {
        if (aborted) return;
        callbacks.onRun(run);
        callbacks.onError(null);
        if (run.status === "completed" && !reportFetched) loadReport();
        if (!isTerminal(run.status)) {
          pollTimeout = setTimeout(pollTick, POLL_INTERVAL_MS);
        }
      })
      .catch((err) => {
        if (aborted) return;
        callbacks.onError(err instanceof Error ? err.message : "Polling failed");
        pollTimeout = setTimeout(pollTick, POLL_INTERVAL_MS);
      })
      .finally(() => {
        if (!aborted) callbacks.onLoadingSettled();
      });
  };

  const startSse = () => {
    sse?.close();
    sse = subscribeToRun(
      runId,
      (event) => {
        if (aborted) return;
        callbacks.onEvent(event);

        if (
          event.event_type === "phase_started" ||
          event.event_type === "phase_completed" ||
          event.event_type === "phase_failed"
        ) {
          refreshRun();
        }

        if (event.event_type === "report_ready") {
          loadReport();
        }

        if (TERMINAL_EVENTS.has(event.event_type)) {
          refreshRun();
          if (event.event_type === "run_completed") loadReport();
          sse?.close();
        }
      },
      () => {
        if (aborted) return;
        sse?.close();
        pollTick();
      },
    );
  };

  const start = () => {
    aborted = false;
    reportFetched = false;
    clearPoll();
    sse?.close();
    sse = null;

    // fetchRunOnce runs first; if the run is already completed, fetch the
    // report directly and skip SSE entirely to avoid a hanging open
    // connection. Otherwise open SSE for live updates.
    fetchRunOnce()
      .then((run) => {
        if (aborted) return;
        callbacks.onRun(run);
        callbacks.onError(null);
        callbacks.onLoadingSettled();
        if (run.status === "completed") {
          loadReport();
          return;
        }
        startSse();
      })
      .catch((err) => {
        if (aborted) return;
        callbacks.onError(err instanceof Error ? err.message : "Failed to fetch run");
        callbacks.onLoadingSettled();
        // Still try SSE in case the run exists but the fetch had a
        // transient error.
        startSse();
      });
  };

  const stop = () => {
    aborted = true;
    clearPoll();
    sse?.close();
    sse = null;
  };

  return { start, stop };
}
