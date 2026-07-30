import { useEffect, useRef, type RefObject } from "react";

/** Distance (px) from the bottom still considered "at bottom". */
const SCROLL_THRESHOLD = 24;

/**
 * Drives `LiveBlockStream`'s "land on current progress once, then stop
 * following" auto-scroll behavior.
 *
 * Genuinely irreducible case for `.cursor/skills/sans-effect` (same
 * class as `useMermaidDiagramRenderer.ts`): `element.scrollIntoView()`
 * is an imperative browser API call, not a derivable value, and it
 * must re-run on every new block/active-id/correlation-id change while
 * respecting mutable "has the user manually scrolled" / "have we
 * already auto-scrolled this flow" flags that persist across renders
 * without themselves triggering one — exactly what refs + a real
 * effect are for. A named hook wrapping the one unavoidable
 * `useEffect` is the sanctioned escape hatch here.
 */
export function useAutoScrollTail(params: {
  containerRef: RefObject<HTMLDivElement | null>;
  tailRef: RefObject<HTMLDivElement | null>;
  correlationId: string | null;
  isLive: boolean;
  orderLength: number;
  activeId: string | null;
}): { handleScroll: () => void } {
  const { containerRef, tailRef, correlationId, isLive, orderLength, activeId } = params;
  const userScrolledUpRef = useRef(false);
  const hasAutoScrolledLiveRef = useRef(false);
  const lastCorrelationRef = useRef<string | null>(null);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_THRESHOLD;
    userScrolledUpRef.current = !atBottom;
  };

  useEffect(() => {
    if (correlationId !== lastCorrelationRef.current) {
      lastCorrelationRef.current = correlationId;
      hasAutoScrolledLiveRef.current = false;
      userScrolledUpRef.current = false;
    }
    if (!isLive) return;
    if (userScrolledUpRef.current) return;
    if (hasAutoScrolledLiveRef.current) return;
    tailRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    hasAutoScrolledLiveRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tailRef is a stable ref object
  }, [orderLength, activeId, isLive, correlationId]);

  return { handleScroll };
}
