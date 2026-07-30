"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useLatestRef } from "@/hooks/useLatestRef";
import {
  createSandboxRunController,
  type SandboxRunControllerCallbacks,
} from "./sandboxRunController";

export interface UseSandboxRunConnectionParams extends SandboxRunControllerCallbacks {
  runId: string | undefined;
  /** Bumped by the orchestrating hook's `refetch()` to force a full restart without a `runId` change. */
  generation: number;
  /** Resets accumulated state (run/report/events/error/loading) — called synchronously before every (re)start. */
  onReset: () => void;
}

/**
 * Owns the sandbox run's fetch → SSE → polling-fallback lifecycle for its
 * entire mount/`runId`/`generation` lifetime.
 *
 * Sanctioned `.cursor/skills/sans-effect` exception (Pattern 4) — same
 * class as QueryTrace's `useFlowStreamConnection`/`useElapsedTick`: a
 * browser `EventSource` plus a `setTimeout` polling fallback are genuine
 * external-system subscriptions that must be torn down and restarted
 * whenever `runId` (or an explicit `refetch()`, modeled as `generation`)
 * changes. There is no derived-state or event-handler equivalent for "tear
 * down and restart a long-lived streaming connection plus a recurring
 * timer whenever an id prop changes."
 */
export function useSandboxRunConnection(params: UseSandboxRunConnectionParams): void {
  const { runId, generation } = params;
  const dispatch = useAppDispatch();
  // Callbacks are read via a ref so the effect below only restarts on a
  // genuine runId/generation change, not on every render (the orchestrating
  // hook passes fresh callback closures each render).
  const callbacksRef = useLatestRef(params);

  useEffect(() => {
    callbacksRef.current.onReset();

    if (!runId) {
      callbacksRef.current.onLoadingSettled();
      return undefined;
    }

    const controller = createSandboxRunController(runId, dispatch, {
      onRun: (run) => callbacksRef.current.onRun(run),
      onReport: (report) => callbacksRef.current.onReport(report),
      onEvent: (event) => callbacksRef.current.onEvent(event),
      onLoadingSettled: () => callbacksRef.current.onLoadingSettled(),
      onError: (message) => callbacksRef.current.onError(message),
    });
    controller.start();

    return () => controller.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: restart only on runId/generation change; dispatch is stable, callbacks are read via a ref (see useLatestRef) to avoid restarting the connection every render.
  }, [runId, generation, dispatch]);
}
