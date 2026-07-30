import { useState, type RefObject } from "react";
import { useMountEffect } from "./useMountEffect";

/**
 * Dynamic scroll fade hook for overflow containers.
 *
 * Returns mask-image CSS that fades the top when scrolled down and
 * fades the bottom when more content exists below.
 *
 * Partial pull-forward ahead of Phase 8's `hooks/useScrollFade.ts` file
 * list entry — needed now by `QueryTrace/blocks/LiveBlockStream.tsx`.
 *
 * Attaching a scroll listener + `ResizeObserver` to an external DOM
 * node is a genuine mount-time external-system sync (`.cursor/skills/
 * sans-effect` Pattern 4) — every call site in this codebase passes a
 * stable ref and a literal `fadeSize`, so `useMountEffect` (mount-only,
 * no reactive deps) is the correct replacement for the original
 * `useEffect(fn, [containerRef, fadeSize])`.
 */
interface ScrollFadeOptions {
  /** Fade depth in pixels. */
  fadeSize?: number;
}

interface ScrollFadeResult {
  maskImage?: string;
  WebkitMaskImage?: string;
}

export function useScrollFade(
  containerRef: RefObject<HTMLElement | null>,
  options: ScrollFadeOptions = {},
): ScrollFadeResult {
  const { fadeSize = 24 } = options;
  const [result, setResult] = useState<ScrollFadeResult>({});

  useMountEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const hasOverflow = el.scrollHeight > el.clientHeight;
      if (!hasOverflow) {
        setResult({});
        return;
      }

      const atTop = el.scrollTop <= 1;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 1;

      let mask: string | undefined;

      if (atTop && atBottom) {
        mask = undefined;
      } else if (atTop && !atBottom) {
        mask = `linear-gradient(to bottom, black calc(100% - ${fadeSize}px), transparent 100%)`;
      } else if (!atTop && atBottom) {
        mask = `linear-gradient(to bottom, transparent 0px, black ${fadeSize}px)`;
      } else {
        mask = `linear-gradient(to bottom, transparent 0px, black ${fadeSize}px, black calc(100% - ${fadeSize}px), transparent 100%)`;
      }

      setResult(mask ? { maskImage: mask, WebkitMaskImage: mask } : {});
    };

    update();
    el.addEventListener("scroll", update, { passive: true });

    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  });

  return result;
}
