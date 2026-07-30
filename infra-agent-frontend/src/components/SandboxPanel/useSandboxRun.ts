"use client";

import { useCallback, useState } from "react";
import type {
  SandboxReport,
  SandboxRun,
  SandboxSseEvent,
} from "@/features/sandbox/sandboxApi.types";
import { useSandboxRunConnection } from "./useSandboxRunConnection";

export interface UseSandboxRunResult {
  run: SandboxRun | null;
  report: SandboxReport | null;
  events: SandboxSseEvent[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Tracks a single sandbox run end-to-end: initial `GET /runs/:runId`, live
 * SSE updates falling back to 5s polling, and a report fetch once the run
 * completes (or on `report_ready`/terminal SSE events).
 *
 * Ported from the Vite app's `hooks/useSandboxRun.ts` (219 LOC), decomposed
 * into this orchestrator (owns only the returned React state) +
 * `sandboxRunController.ts` (framework-agnostic fetch/SSE/poll control
 * flow) + `useSandboxRunConnection.ts` (the one sanctioned mount/`runId`-
 * keyed `useEffect`). Co-located under `src/components/SandboxPanel/`
 * (not `src/hooks/`) — same "Earned Complexity" call Phase 8 made for
 * `src/components/QueryTrace/useFlowStream.ts` and its siblings: this
 * hook is single-feature-specific and changes together with the
 * SandboxPanel components that consume it.
 */
export function useSandboxRun(runId: string | undefined): UseSandboxRunResult {
  const [run, setRun] = useState<SandboxRun | null>(null);
  const [report, setReport] = useState<SandboxReport | null>(null);
  const [events, setEvents] = useState<SandboxSseEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(runId));
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);

  const onReset = useCallback(() => {
    setRun(null);
    setReport(null);
    setEvents([]);
    setError(null);
    setIsLoading(true);
  }, []);
  const onRun = useCallback((next: SandboxRun) => setRun(next), []);
  const onReport = useCallback((next: SandboxReport) => setReport(next), []);
  const onEvent = useCallback(
    (event: SandboxSseEvent) => setEvents((prev) => [...prev, event]),
    [],
  );
  const onLoadingSettled = useCallback(() => setIsLoading(false), []);
  const onError = useCallback((message: string | null) => setError(message), []);

  useSandboxRunConnection({
    runId,
    generation,
    onReset,
    onRun,
    onReport,
    onEvent,
    onLoadingSettled,
    onError,
  });

  const refetch = useCallback(() => {
    if (runId) setGeneration((g) => g + 1);
  }, [runId]);

  return { run, report, events, isLoading, error, refetch };
}
