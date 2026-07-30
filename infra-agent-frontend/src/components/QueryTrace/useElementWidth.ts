import { useRef, useState, type RefObject } from "react";
import { useMountEffect } from "@/hooks/useMountEffect";

/**
 * Tracks an element's live `offsetWidth` via a mount-time
 * `ResizeObserver` subscription — used by `PlanApprovalCard` to decide
 * when the DAG node list should truncate on a narrow panel.
 *
 * Sanctioned `.cursor/skills/sans-effect` `useMountEffect` case: same
 * shape as `useCompactWidthObserver.ts` — a browser-API subscription
 * whose lifetime matches the mounted node.
 */
export function useElementWidth<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  width: number;
} {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useMountEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => setWidth(el.offsetWidth);
    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  });

  return { ref, width };
}
