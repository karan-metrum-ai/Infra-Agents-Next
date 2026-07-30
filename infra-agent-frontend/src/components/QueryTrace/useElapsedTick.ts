import { useEffect, useState } from "react";

/**
 * Forces a re-render once per second while `isInProgress` is true, so
 * `TraceHeader`'s live elapsed-duration display ticks up without a
 * server round-trip.
 *
 * Sanctioned `.cursor/skills/sans-effect` exception: a `setInterval`
 * timer is a genuine external-system subscription (Pattern 4) — there
 * is no derived-state equivalent for "re-render every second," and the
 * timer must be torn down/restarted whenever `isInProgress`/`startTimeMs`
 * change, ruling out `useMountEffect`.
 */
export function useElapsedTick(isInProgress: boolean, startTimeMs: number | null): void {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isInProgress || startTimeMs == null) {
      return;
    }
    const id = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isInProgress, startTimeMs]);
}
