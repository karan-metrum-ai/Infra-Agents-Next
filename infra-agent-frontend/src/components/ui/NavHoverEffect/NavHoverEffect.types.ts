import type { ReactNode } from "react";

export interface NavHoverEffectProps {
  children: ReactNode;
  className?: string;
  /** Index of the currently active nav item (no hover pill on it). */
  activeIndex?: number;
}
