"use client";

import type { CSSProperties } from "react";
import styles from "./skeletons.module.css";

/**
 * Small pulsing dot indicator used inside skeleton/thinking headers to
 * signal "live, waiting for data" — distinct from `Shimmer` which
 * represents static placeholder content.
 *
 * Canonical home for this primitive (consolidated from a duplicate
 * `blocks/PulseDot.tsx` created by an earlier Phase 8 slice before this
 * `skeletons/*` subtree existed — `blocks/*` now imports from here).
 */
export interface PulseDotProps {
  /** Diameter in pixels. */
  size?: number;
  /** Override the dot color via CSS custom property (e.g. `var(--warning-500)`). */
  color?: string;
  /** Accessible label, exposed via `aria-label`. */
  ariaLabel?: string;
}

function PulseDot({ size = 8, color, ariaLabel = "Live" }: PulseDotProps) {
  const style: CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };
  if (color) {
    (style as Record<string, string>)["--pulse-dot-color"] = color;
  }

  return (
    <span aria-hidden="true" aria-label={ariaLabel} className={styles.pulseDot} style={style} />
  );
}

export default PulseDot;
