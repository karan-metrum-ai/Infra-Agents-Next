import { useEffect } from "react";

/** Wait after REST hydration before showing the empty trace state. */
const EMPTY_TRACE_TIMEOUT_MS = 5000;

/**
 * Stops `QueryTracePanel`'s loading skeleton after a grace period once
 * the SSE stream has "settled" (connected or REST-hydrated) but the
 * flow genuinely produced no trace content.
 *
 * Sanctioned `.cursor/skills/sans-effect` exception: a `setTimeout` is
 * a real external timer, and it must be re-armed whenever any of its
 * inputs change (mirrors the original Vite effect's dependency list)
 * — there is no derived-state equivalent for "flip this after N
 * elapsed ms of nothing happening."
 */
export function useEmptyTraceFallback(params: {
  hydrationSettled: boolean;
  loading: boolean;
  hasRenderableContent: boolean;
  wsConnected: boolean;
  setLoading: (value: boolean) => void;
}): void {
  const { hydrationSettled, loading, hasRenderableContent, wsConnected, setLoading } = params;

  useEffect(() => {
    if (!hydrationSettled || !loading || hasRenderableContent) {
      return;
    }

    const delayMs = wsConnected ? 2000 : EMPTY_TRACE_TIMEOUT_MS;
    const timer = window.setTimeout(() => {
      setLoading(false);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [hydrationSettled, loading, hasRenderableContent, wsConnected, setLoading]);
}
