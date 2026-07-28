"use client";

/**
 * Auto-retry polling for the `/digital-twin` route while the backend's
 * bulk-upload processing pipeline is still populating infrastructure data.
 * Polls `refetch` every `POLL_INTERVAL_S` seconds for up to `MAX_WAIT_S`
 * before the caller should surface a timeout error.
 */

import { useEffect, useRef, useState } from "react";

/** Seconds between automatic refetch attempts when no data is found yet. */
const POLL_INTERVAL_S = 20;

/** Maximum seconds to keep polling before surfacing an error. */
const MAX_WAIT_S = 180;

export interface UseDigitalTwinPollingOptions {
  hasData: boolean;
  hasError: boolean;
  refetch: () => void;
}

export interface DigitalTwinPollingState {
  pollCount: number;
  elapsed: number;
  timedOut: boolean;
  pollIntervalSeconds: number;
  resetPolling: () => void;
}

export function useDigitalTwinPolling({
  hasData,
  hasError,
  refetch,
}: UseDigitalTwinPollingOptions): DigitalTwinPollingState {
  const [pollCount, setPollCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const timedOut = elapsed >= MAX_WAIT_S;

  useEffect(() => {
    if (hasData || hasError || timedOut) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + POLL_INTERVAL_S;
        if (next < MAX_WAIT_S) {
          setPollCount((c) => c + 1);
          refetch();
        }
        return next;
      });
    }, POLL_INTERVAL_S * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasData, hasError, timedOut, refetch]);

  const resetPolling = () => {
    setElapsed(0);
    setPollCount(0);
  };

  return { pollCount, elapsed, timedOut, pollIntervalSeconds: POLL_INTERVAL_S, resetPolling };
}
