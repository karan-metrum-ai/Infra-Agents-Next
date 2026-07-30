"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, Copy, RefreshCw } from "lucide-react";

import styles from "./TracePanelFailedState.module.css";

interface TracePanelFailedStateProps {
  correlationId: string;
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

function shortId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

/**
 * Dedicated failed state for QueryTracePanel.
 *
 * Richer layout than empty/disconnected: status badge, error terminal,
 * flow metadata, recovery hints, and retry.
 */
function TracePanelFailedState({
  correlationId,
  error,
  onRetry,
  isRetrying = false,
}: TracePanelFailedStateProps) {
  const [copiedError, setCopiedError] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const errorText = error?.trim() || "";
  const hasErrorDetail = errorText.length > 0;

  const copyToClipboard = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }, []);

  return (
    <div
      className={styles.traceFailed}
      role="alert"
      aria-live="assertive"
      aria-labelledby="trace-failed-title"
    >
      <div className={styles.traceFailedAccent} aria-hidden="true" />

      <div className={styles.traceFailedBody}>
        <header className={styles.traceFailedHeader}>
          <div className={styles.traceFailedIconWrap}>
            <AlertTriangle size={24} aria-hidden />
          </div>
          <div className={styles.traceFailedHeaderText}>
            <span className={styles.traceFailedBadge}>Load failed</span>
            <h3 id="trace-failed-title" className={styles.traceFailedTitle}>
              Trace could not be loaded
            </h3>
            <p className={styles.traceFailedSubtitle}>
              The agent flow exists, but we could not fetch or parse its trace data. Retry loads a
              fresh snapshot from the server.
            </p>
          </div>
        </header>

        {hasErrorDetail && (
          <section className={styles.traceFailedErrorPanel} aria-label="Error details">
            <div className={styles.traceFailedErrorHead}>
              <span className={styles.traceFailedErrorLabel}>Error details</span>
              <button
                type="button"
                className={styles.traceFailedCopyBtn}
                onClick={() => copyToClipboard(errorText, setCopiedError)}
                aria-label="Copy error message"
              >
                {copiedError ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                {copiedError ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className={styles.traceFailedErrorPre}>{errorText}</pre>
          </section>
        )}

        <div className={styles.traceFailedMetaRow}>
          <span className={styles.traceFailedMetaLabel}>Flow ID</span>
          <code className={styles.traceFailedMetaValue} title={correlationId}>
            {shortId(correlationId)}
          </code>
          <button
            type="button"
            className={styles.traceFailedCopyBtn}
            onClick={() => copyToClipboard(correlationId, setCopiedId)}
            aria-label="Copy flow ID"
          >
            {copiedId ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
          </button>
        </div>

        <section className={styles.traceFailedHints} aria-label="What to try">
          <span className={styles.traceFailedHintsTitle}>What to try</span>
          <ul className={styles.traceFailedHintsList}>
            <li>Press Retry to fetch the latest flow snapshot.</li>
            <li>Pick another run from Recent Flows if this session has no trace.</li>
            <li>If the error persists, refresh the page or check that the agent team is online.</li>
          </ul>
        </section>

        {onRetry && (
          <div className={styles.traceFailedActions}>
            <button
              type="button"
              className={styles.traceFailedRetryBtn}
              onClick={onRetry}
              disabled={isRetrying}
            >
              <RefreshCw
                size={16}
                className={isRetrying ? styles.traceFailedBtnSpinner : undefined}
                aria-hidden
              />
              {isRetrying ? "Retrying…" : "Retry loading trace"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TracePanelFailedState;
