"use client";

import { createElement, type ReactNode } from "react";
import styles from "./shimmerText.module.css";

/**
 * Wraps in-progress (streaming) text with a subtle moving shine.
 *
 * The effect is a GPU-cheap animated linear-gradient masked onto the
 * text via ``background-clip: text`` — only ``background-position``
 * animates, never layout. While ``active`` is false the children
 * render at full solid colour with no animation.
 *
 * Honours ``prefers-reduced-motion: reduce`` (animation disabled,
 * static solid text) via the stylesheet.
 */
interface ShimmerTextProps {
  /** When true, the shine animates; on finalize pass false. */
  active: boolean;
  /** Element to render. Defaults to a block-level div. */
  as?: "div" | "span";
  className?: string;
  children: ReactNode;
}

function ShimmerText({ active, as = "div", className, children }: ShimmerTextProps) {
  const cls = [active ? styles.shimmer : null, className].filter(Boolean).join(" ");

  return createElement(
    as,
    {
      className: cls || undefined,
      "data-shimmer": active ? "true" : undefined,
    },
    children,
  );
}

export default ShimmerText;
