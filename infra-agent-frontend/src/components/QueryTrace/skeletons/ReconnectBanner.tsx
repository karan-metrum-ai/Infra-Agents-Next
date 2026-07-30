"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import PulseDot from "./PulseDot";
import styles from "./ReconnectBanner.module.css";

/**
 * Inline banner shown when the SSE EventSource is disconnected and the
 * client is attempting to reconnect. Pairs a status indicator with a
 * short message and an optional retry control.
 *
 * Layout-stable: identical height when hidden vs. visible so the
 * trace panel does not jump when the banner toggles on/off.
 *
 * Two visually distinct states:
 * - `connecting` — live retry in progress, amber `PulseDot` (the
 *   stream is expected to recover on its own).
 * - `failed` — retries exhausted, static `WifiOff` icon in the
 *   destructive palette (a clearer "action needed" signal than a
 *   second pulsing dot would give) plus a `Retry` button with a
 *   `RefreshCw` icon.
 *
 * Polished port of Vite's `skeletons/ReconnectBanner.tsx`: all styling
 * moved out of inline `style` props into `ReconnectBanner.module.css`
 * (zero hardcoded colors — warning/destructive semantic tokens via
 * `color-mix()`), a proper hover/focus-visible state on the Retry
 * button matching `AgentNode.module.css`'s `.settingsBtn` pattern, and
 * a subtle slide-down/fade-in entrance that respects
 * `prefers-reduced-motion`.
 */
interface ReconnectBannerProps {
  /** Connection state — `connecting` (live retry in progress) or `failed`. */
  state?: "connecting" | "failed";
  /** Optional message override. */
  message?: string;
  /** Optional manual retry handler. */
  onRetry?: () => void;
}

function ReconnectBanner({ state = "connecting", message, onRetry }: ReconnectBannerProps) {
  const isFailed = state === "failed";
  const resolvedMessage =
    message ??
    (isFailed
      ? "Live stream disconnected. Retry to resume updates."
      : "Reconnecting to the live stream…");

  return (
    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a connection-status live region, which `role="status"` models more accurately.
    <div className={styles.reconnectBanner} data-state={state} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        {isFailed ? (
          <WifiOff size={14} />
        ) : (
          <PulseDot ariaLabel="Reconnecting" color="var(--warning-500)" />
        )}
      </span>
      <span className={styles.reconnectBannerText}>{resolvedMessage}</span>
      {onRetry && (
        <button type="button" className={styles.retryBtn} onClick={onRetry}>
          <RefreshCw size={12} aria-hidden="true" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}

export default ReconnectBanner;
