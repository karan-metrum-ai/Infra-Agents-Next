"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { copyToClipboard } from "@/utils/clipboard";
import CopyButton from "./CopyButton";
import styles from "./blocks.module.css";
import type { BlockStatus } from "../blockStream/types";

/**
 * Shared visual frame for every block kind.
 *
 * Provides the outer card, status indicator, header row, and an
 * optional copy-to-clipboard button. Block components plug their
 * content into `children`.
 *
 * Active header shine (`traceLabelActive`) applies only when the block
 * is streaming — completed blocks get a static muted label.
 */
interface BlockFrameProps {
  /** Block kind label rendered in the header. */
  kind: string;
  /** Current block status. */
  status: BlockStatus;
  /** Whether the block has been locked (no more updates). */
  locked: boolean;
  /** Optional header right-side accessory (e.g. tool name chip). */
  accessory?: ReactNode;
  /** Optional expand/collapse control in the header row. */
  headerToggle?: ReactNode;
  /** Render the toggle beside the kind label instead of on the right. */
  inlineToggle?: boolean;
  /** Optional override class for the outer frame. */
  className?: string;
  /** Show copy button. Defaults to true once block is locked. */
  copyable?: boolean;
  /**
   * Render as bare prose (no card chrome / header) — used for the
   * assistant's answer so it reads like chat text, with a copy
   * affordance revealed on hover.
   */
  plain?: boolean;
  children: ReactNode;
}

function BlockFrame({
  kind,
  status,
  locked,
  accessory,
  headerToggle,
  inlineToggle = false,
  className,
  copyable,
  plain,
  children,
}: BlockFrameProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const showCopy = copyable ?? locked;

  const handleCopy = useCallback(async () => {
    const text = bodyRef.current?.textContent ?? "";
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, []);

  const isStreaming = status === "streaming" || status === "pending";
  const isFailed = status === "failed";

  const kindLabelClass = isStreaming
    ? styles.traceLabelActive
    : isFailed
      ? styles.traceLabelFailed
      : styles.traceLabelStatic;

  if (plain) {
    return (
      <div
        className={[styles.blockPlain, className].filter(Boolean).join(" ")}
        data-status={status}
        aria-live={isStreaming ? "polite" : "off"}
      >
        <div className={styles.blockBody} ref={bodyRef}>
          {children}
        </div>
        {showCopy && (
          <CopyButton
            copied={copied}
            onClick={handleCopy}
            variant="plain"
            title="Copy to clipboard"
            aria-label="Copy response"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={[styles.blockFrame, className].filter(Boolean).join(" ")}
      data-status={status}
      data-locked={String(locked)}
      aria-live={isStreaming ? "polite" : "off"}
    >
      <div className={styles.blockHeader} data-status={status}>
        <div className={styles.blockHeaderStart}>
          <span className={[styles.blockHeaderKind, kindLabelClass].filter(Boolean).join(" ")}>
            {kind}
          </span>
          {inlineToggle && headerToggle}
        </div>
        {(accessory || (!inlineToggle && headerToggle) || showCopy) && (
          <div className={styles.blockHeaderEnd}>
            {accessory}
            {!inlineToggle && headerToggle}
            {showCopy && (
              <CopyButton
                copied={copied}
                onClick={handleCopy}
                title="Copy to clipboard"
                aria-label="Copy block content"
              />
            )}
          </div>
        )}
      </div>
      <div className={styles.blockBody} ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}

export default BlockFrame;
