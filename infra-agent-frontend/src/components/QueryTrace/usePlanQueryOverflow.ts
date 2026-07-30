import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Detects whether a collapsed (line-clamped) query body actually
 * overflows its clamp, so `PlanApprovalQuery` only shows a "Show more"
 * toggle when there is genuinely more content to reveal.
 *
 * Sanctioned `.cursor/skills/sans-effect` exception: measuring
 * `scrollHeight` vs `clientHeight` is an imperative DOM read that must
 * re-run whenever the rendered content or the expanded/collapsed mode
 * changes (a `ResizeObserver` alone would miss content-driven height
 * changes at a fixed container width) — there is no derived-state
 * equivalent for "did the browser's layout engine clip this element."
 */
export function usePlanQueryOverflow(
  content: string,
  expanded: boolean,
): { ref: RefObject<HTMLDivElement | null>; overflows: boolean } {
  const ref = useRef<HTMLDivElement | null>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !content) {
      setOverflows(false);
      return;
    }
    if (expanded) {
      return;
    }
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 2);
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [content, expanded]);

  return { ref, overflows };
}
