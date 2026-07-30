"use client";

import type { CSSProperties } from "react";
import styles from "./skeletons.module.css";

/**
 * Layout-stable shimmer primitive.
 *
 * Renders a single rounded block with a moving gradient. Use exactly
 * the same width/height/padding the real element will have so the
 * layout does not shift when the live data replaces the skeleton.
 *
 * Honours `prefers-reduced-motion`: the animation is replaced by a
 * static dim fill for users with motion sensitivities.
 *
 * Canonical home for this primitive (consolidated from a duplicate
 * `blocks/Shimmer.tsx` created by an earlier Phase 8 slice before this
 * `skeletons/*` subtree existed — `blocks/*` now imports from here).
 */
export interface ShimmerProps {
  /** CSS width — accepts any valid CSS length, defaults to 100%. */
  width?: string | number;
  /** CSS height — defaults to 1em so it lines up with text rows. */
  height?: string | number;
  /** Border radius override (CSS length). Defaults to 6px. */
  radius?: string | number;
  /** Optional className for extra positional tweaks. */
  className?: string;
  /** Optional inline-style overrides for fine positioning. */
  style?: CSSProperties;
  /** Render mode: `block` (default) or `inline` for inline-flex use. */
  inline?: boolean;
  /** Accessible label, exposed via `aria-label`. */
  ariaLabel?: string;
}

function Shimmer({
  width = "100%",
  height = "1em",
  radius = 6,
  className,
  style,
  inline,
  ariaLabel = "Loading",
}: ShimmerProps) {
  const resolvedStyle: CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: typeof radius === "number" ? `${radius}px` : radius,
    ...style,
  };

  return (
    <span
      aria-hidden="true"
      aria-label={ariaLabel}
      className={[styles.shimmer, inline ? styles.shimmerInline : styles.shimmerBlock, className]
        .filter(Boolean)
        .join(" ")}
      style={resolvedStyle}
    />
  );
}

export default Shimmer;
