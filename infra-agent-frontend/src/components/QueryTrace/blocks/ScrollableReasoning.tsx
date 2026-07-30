"use client";

import type { ReactNode } from "react";
import { useReasoningScrollFades } from "./useReasoningScrollFades";
import styles from "./scrollableReasoning.module.css";

/** Default cap for reasoning height before internal scrolling kicks in. */
export const REASONING_MAX_HEIGHT = 240;

/**
 * Fixed-height, internally-scrollable container for large reasoning
 * content.
 *
 * Does not auto-scroll — the user's position is left alone as content
 * streams in. Top/bottom fades signal that there is more content
 * above/below. The scroll region is keyboard-focusable.
 */
interface ScrollableReasoningProps {
  /** Monotonic value that changes as content grows. */
  revision: number;
  /** Max height in px before scrolling. Defaults to REASONING_MAX_HEIGHT. */
  maxHeight?: number;
  children: ReactNode;
}

function ScrollableReasoning({
  revision,
  maxHeight = REASONING_MAX_HEIGHT,
  children,
}: ScrollableReasoningProps) {
  const { scrollRef, fades, handleScroll } = useReasoningScrollFades(revision);

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.fadeTop} ${styles.fadeVisible}`} aria-hidden="true" />
      <div
        ref={scrollRef}
        className={styles.scroll}
        style={{ maxHeight }}
        onScroll={handleScroll}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- standard WCAG SC 2.1.1 technique: a focusable scroll container so keyboard users can scroll this region.
        tabIndex={0}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<section>` cannot receive keyboard focus for scrolling; this must stay a focusable `div` with `role="region"`.
        role="region"
        aria-label="Reasoning detail"
      >
        {children}
      </div>
      <div
        className={[styles.fadeBottom, fades.bottom ? styles.fadeVisible : null]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      />
    </div>
  );
}

export default ScrollableReasoning;
