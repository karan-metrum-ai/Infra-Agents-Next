import { useRef, useState, type RefObject } from "react";
import { useMountEffect } from "@/hooks/useMountEffect";

/**
 * Tracks whether a container has dropped below `thresholdPx` via a
 * `ResizeObserver`, for `PhaseTimelineBar`'s compact-label breakpoint.
 *
 * Sanctioned `.cursor/skills/sans-effect` `useMountEffect` case: a
 * `ResizeObserver` subscription is a genuine browser-API/DOM
 * integration whose lifetime matches the mounted node, not a value
 * derivable from props/state.
 */
export function useCompactWidthObserver(thresholdPx: number): {
  containerRef: RefObject<HTMLDivElement | null>;
  compact: boolean;
} {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);

  useMountEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setCompact(entry.contentRect.width < thresholdPx);
    });

    observer.observe(el);
    return () => observer.disconnect();
  });

  return { containerRef, compact };
}
