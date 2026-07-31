"use client";

/**
 * RawJsonDrawer -- safety-net section at the bottom of the panel.
 *
 * Customers can open this to see the verbatim JSON of every API response
 * that drives the panel. This is the explicit guarantee that nothing
 * returned by the backend is silently dropped.
 *
 * Adaptation notes:
 *  - The ad hoc `document.addEventListener("keydown", ...)` Escape
 *    handler is replaced by `useDialogFocusTrap`, matching every other
 *    drawer/dialog in this phase (adds Tab-cycling, initial focus, and
 *    focus restoration for free).
 *  - The "Copied" flash state (`copied`, reset via `window.setTimeout`)
 *    is unchanged -- it's already event-driven (set inside the click
 *    handler itself, not synced from other state via an effect), so it
 *    doesn't violate the zero-`useEffect` rule as written.
 *  - `formatBytes` (already ported to `@/lib/formatters`) replaces the
 *    source's inline `(new Blob([text]).size / 1024).toFixed(1)` KB-only
 *    math with the shared binary-unit formatter used across this app's
 *    Sandbox surface, per the instruction to use `lib/formatters` helpers.
 */

import { useMemo, useState } from "react";
import { Check, Copy, FileText, X } from "lucide-react";

import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { formatBytes } from "@/lib/formatters";
import styles from "./RawJsonDrawer.module.css";

interface RawJsonDrawerProps {
  open: boolean;
  payload: unknown;
  title?: string;
  onClose: () => void;
}

export function RawJsonDrawer({
  open,
  payload,
  title = "Raw run JSON",
  onClose,
}: RawJsonDrawerProps) {
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }, [payload]);

  const sizeLabel = useMemo(() => formatBytes(text ? new Blob([text]).size : 0), [text]);

  if (!open) return null;

  const handleCopy = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <>
      <div className={styles.drawerBackdrop} onClick={onClose} aria-hidden="true" />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onKeyDown` is Escape-to-close/Tab-cycling via `useDialogFocusTrap`, supplemental to the close button which remains fully keyboard/screen-reader operable. */}
      <aside
        ref={dialogRef}
        className={styles.drawer}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled elements + `useDialogFocusTrap` rather than the native `<dialog>` element, matching `SaveTeamModal`/`NodeDetailsModal`.
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.drawerHeader}>
          <div className={styles.drawerHeaderText}>
            <div className={styles.drawerTitleRow}>
              <FileText size={14} className={styles.drawerTitleIcon} aria-hidden="true" />
              <div className={styles.drawerTitle}>{title}</div>
            </div>
            <div className={styles.drawerSubtitle}>{sizeLabel} · verbatim API response</div>
          </div>
          <div className={styles.drawerHeaderActions}>
            <button
              type="button"
              className={`${styles.actionButton} ${copied ? styles.actionButtonCopied : ""}`}
              onClick={handleCopy}
              aria-label="Copy raw JSON to clipboard"
            >
              {copied ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Copy size={12} aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              className={styles.drawerClose}
              onClick={onClose}
              aria-label="Close drawer"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
        <pre className={styles.rawJsonViewer}>{text}</pre>
      </aside>
    </>
  );
}

export default RawJsonDrawer;
