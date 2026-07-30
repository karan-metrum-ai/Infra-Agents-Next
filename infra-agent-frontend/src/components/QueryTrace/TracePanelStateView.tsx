"use client";

import type { ReactNode } from "react";
import { RefreshCw, SearchX, WifiOff } from "lucide-react";

import TracePanelFailedState from "./TracePanelFailedState";
import styles from "./TracePanelStateView.module.css";

export type TracePanelStateVariant = "empty" | "disconnected" | "failed";

interface TracePanelStateViewProps {
  variant: TracePanelStateVariant;
  correlationId: string;
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

interface IdleVariantConfig {
  tone: "neutral" | "warning";
  icon: ReactNode;
  title: string;
  message: string;
}

function getIdleVariantConfig(variant: "empty" | "disconnected"): IdleVariantConfig {
  if (variant === "disconnected") {
    return {
      tone: "warning",
      icon: <WifiOff size={22} aria-hidden />,
      title: "Waiting for live stream",
      message:
        "Connected to the dashboard, but trace events have not arrived yet. They should appear shortly, or you can retry to pull a snapshot.",
    };
  }
  return {
    tone: "neutral",
    icon: <SearchX size={22} aria-hidden />,
    title: "No trace recorded",
    message:
      "This flow has no trace events yet. The run may still be starting, or trace data was not saved for this session.",
  };
}

/**
 * Empty and disconnected states for QueryTracePanel.
 *
 * Failed loads use TracePanelFailedState for a richer error layout.
 */
function TracePanelStateView({
  variant,
  correlationId,
  error,
  onRetry,
  isRetrying = false,
}: TracePanelStateViewProps) {
  if (variant === "failed") {
    return (
      <TracePanelFailedState
        correlationId={correlationId}
        error={error}
        onRetry={onRetry}
        isRetrying={isRetrying}
      />
    );
  }

  const config = getIdleVariantConfig(variant);

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is an idle/empty-state notice, which `role="status"` (a live region) models more accurately.
    <div
      className={styles.traceStateCard}
      role="status"
      aria-live="polite"
      aria-label={config.title}
    >
      <div className={styles.traceStateIconWrap} data-tone={config.tone}>
        {config.icon}
      </div>

      <h3 className={styles.traceStateTitle}>{config.title}</h3>
      <p className={styles.traceStateMessage}>{config.message}</p>

      <div className={styles.traceStateMeta}>
        <span className={styles.traceStateMetaLabel}>Flow ID</span>
        <code className={styles.traceStateMetaValue} title={correlationId}>
          {shortId(correlationId)}
        </code>
      </div>

      {onRetry && (
        <div className={styles.traceStateActions}>
          <button
            type="button"
            className={styles.traceStatePrimaryBtn}
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw
              size={14}
              className={isRetrying ? styles.traceStateBtnSpinner : undefined}
              aria-hidden
            />
            {isRetrying ? "Retrying…" : "Refresh trace"}
          </button>
        </div>
      )}
    </div>
  );
}

export default TracePanelStateView;
