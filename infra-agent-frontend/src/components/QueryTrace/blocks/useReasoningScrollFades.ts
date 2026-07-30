import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/**
 * Tracks whether `ScrollableReasoning`'s internal scroll region has
 * more content above/below the visible viewport, so it can show/hide
 * its top/bottom fade overlays as streamed content grows.
 *
 * Genuinely irreducible case for `.cursor/skills/sans-effect` (same
 * class as `useMermaidDiagramRenderer.ts`): `scrollHeight`/
 * `clientHeight`/`scrollTop` are real values the browser's layout
 * engine computes after paint — they cannot be derived from
 * `revision` via `useMemo`. `useMountEffect` does not fit either: this
 * must re-run every time `revision` increments (new content committed
 * to the DOM), not just once on mount — and remounting the scroll
 * container via `key={revision}` would reset the user's scroll
 * position on every streamed chunk, which is the exact behavior the
 * fade-affordance UX depends on NOT happening. A named hook wrapping
 * the one unavoidable `useEffect` is the sanctioned escape hatch here.
 */
export interface ScrollFades {
  top: boolean;
  bottom: boolean;
}

export function useReasoningScrollFades(revision: number): {
  scrollRef: RefObject<HTMLDivElement | null>;
  fades: ScrollFades;
  handleScroll: () => void;
} {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fades, setFades] = useState<ScrollFades>({ top: false, bottom: false });

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollTop > 4;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > 4;
    setFades((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }));
  }, []);

  useEffect(() => {
    updateFades();
  }, [revision, updateFades]);

  return { scrollRef, fades, handleScroll: updateFades };
}
