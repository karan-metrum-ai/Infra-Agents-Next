"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogFocusTrap {
  /** Attach to the dialog's outermost element (the one with `role="dialog"`). */
  dialogRef: (node: HTMLDivElement | null) => void;
  /** Attach to the same element's `onKeyDown` — handles Escape-to-close and Tab-cycling. */
  handleKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

/**
 * Accessible-dialog focus management with **zero `useEffect` calls** (see
 * `.cursor/skills/sans-effect/SKILL.md`):
 *
 * - Initial focus, body-scroll lock, and focus restoration ride on a
 *   memoized ref-callback's React 19 unmount-cleanup return instead of an
 *   effect — the callback only runs when the dialog node itself
 *   mounts/unmounts, which happens exactly once per open/close cycle since
 *   every caller conditionally renders the dialog only while `isOpen`
 *   (Pattern 4/5: mount-time external sync via a stable callback ref).
 * - Escape-to-close and Tab focus-trapping are plain keyboard event
 *   handlers (Pattern 3) — no document-level listener is needed because
 *   focus never leaves the dialog subtree.
 *
 * Usage: spread `dialogRef` onto the dialog container's `ref` and
 * `handleKeyDown` onto its `onKeyDown`.
 */
export function useDialogFocusTrap(onClose: () => void): DialogFocusTrap {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const dialogRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (!node) return undefined;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstFocusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? node).focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !containerRef.current) return;

      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  return { dialogRef, handleKeyDown };
}
