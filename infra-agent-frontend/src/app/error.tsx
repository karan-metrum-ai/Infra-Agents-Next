"use client";

import { ErrorFallback } from "@/components/ErrorFallback/ErrorFallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Application error"
      errorMessage={error.message}
      fullScreen
      onRetry={reset}
    />
  );
}
