"use client";

/**
 * Fills the canvas to the full container so the globe is not boxed into a
 * smaller centered square. A ResizeObserver (not a window resize listener)
 * picks up container size changes that aren't window resizes, e.g.
 * entering/leaving split view or the bottom stats bar growing at a wider
 * tier.
 */

import { useEffect, useState, type RefObject } from "react";

export interface GlobeDimensions {
  width: number;
  height: number;
}

export function useGlobeDimensions(
  containerRef: RefObject<HTMLDivElement | null>,
): GlobeDimensions {
  const [dimensions, setDimensions] = useState<GlobeDimensions>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const applySize = (width: number, height: number) => {
      setDimensions({ width: Math.max(0, width), height: Math.max(0, height) });
    };

    const rect = container.getBoundingClientRect();
    applySize(rect.width, rect.height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      applySize(width, height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  return dimensions;
}
