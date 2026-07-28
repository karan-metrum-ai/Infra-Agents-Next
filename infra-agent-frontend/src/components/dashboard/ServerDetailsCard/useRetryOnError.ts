"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const BACKOFF_MULTIPLIER = 2;

/**
 * Exponential-backoff retry for a query's error state — only surfaces a
 * visible error after all retry attempts are exhausted, so transient fetch
 * errors don't immediately flash an error UI.
 */
export function useRetryOnError(
  isError: boolean,
  refetch: () => void,
  maxRetries: number = MAX_RETRY_ATTEMPTS,
  initialDelay: number = INITIAL_RETRY_DELAY_MS,
): { shouldShowError: boolean; retryCount: number; resetRetries: () => void } {
  const [retryCount, setRetryCount] = useState(0);
  const [shouldShowError, setShouldShowError] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isError && retryCount < maxRetries) {
      const delay = initialDelay * Math.pow(BACKOFF_MULTIPLIER, retryCount);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          setRetryCount((prev) => prev + 1);
          refetch();
        }
      }, delay);

      setShouldShowError(false);
    } else if (isError && retryCount >= maxRetries) {
      setShouldShowError(true);
    } else if (!isError) {
      setRetryCount(0);
      setShouldShowError(false);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }
  }, [isError, retryCount, maxRetries, initialDelay, refetch]);

  const resetRetries = useCallback(() => {
    setRetryCount(0);
    setShouldShowError(false);
    refetch();
  }, [refetch]);

  return { shouldShowError, retryCount, resetRetries };
}

export { MAX_RETRY_ATTEMPTS };
