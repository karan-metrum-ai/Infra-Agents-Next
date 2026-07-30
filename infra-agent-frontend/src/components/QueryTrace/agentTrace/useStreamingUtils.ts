import { useRef, useCallback, useEffect, type RefObject } from "react";

/**
 * Stick-to-bottom autoscroll hook.
 *
 * Pins the scroll container to the bottom while streaming is active;
 * releases when the user scrolls up. Returns a ref to attach to
 * the scrollable container and a "jump to latest" callback.
 *
 * Sanctioned `.cursor/skills/sans-effect` exception (same class as
 * `blocks/useAutoScrollTail.ts`): a scroll-position listener and a
 * "scroll to bottom on new content while pinned" reaction are both
 * genuine imperative DOM/browser-API syncs with no derived-state or
 * event-handler equivalent — the mutable "is the user currently
 * scrolled up" flag must persist across renders without itself
 * triggering one.
 */
export function useAutoScroll(isStreaming: boolean) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef(true);
  const userScrolledRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinnedRef.current = true;
    userScrolledRef.current = false;
  }, []);

  // Subscribe to the container's native `scroll` event for the
  // lifetime of the mounted node — a browser API subscription, the
  // textbook `useMountEffect` case.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const threshold = 40;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      pinnedRef.current = atBottom;
      userScrolledRef.current = !atBottom;
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Re-arms on every render while streaming so newly appended content
  // (which changes `scrollHeight` without necessarily changing any
  // prop this hook receives) keeps the view pinned to the bottom —
  // an imperative "keep following the tail" sync, not derivable state.
  useEffect(() => {
    if (!isStreaming || !pinnedRef.current) return;
    const el = containerRef.current;
    if (!el) return;

    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  });

  return {
    containerRef: containerRef as RefObject<HTMLDivElement | null>,
    scrollToBottom,
    isPinned: () => pinnedRef.current,
    isUserScrolled: () => userScrolledRef.current,
  };
}

/**
 * rAF token batcher. Buffers incoming string deltas and flushes once
 * per animation frame to kill render thrash.
 */
export function createTokenBatcher(onFlush: (accumulated: string) => void) {
  let buffer = "";
  let rafId: number | null = null;

  function push(delta: string) {
    buffer += delta;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        const flushed = buffer;
        buffer = "";
        rafId = null;
        onFlush(flushed);
      });
    }
  }

  function dispose() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (buffer) {
      onFlush(buffer);
      buffer = "";
    }
  }

  return { push, dispose };
}
