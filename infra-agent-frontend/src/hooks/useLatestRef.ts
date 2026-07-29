import { useRef, type RefObject } from "react";

/**
 * Returns a ref that always holds the latest `value`, without a
 * `useEffect` mirror.
 *
 * Replaces the common `useEffect(() => { ref.current = value }, [value])`
 * pattern (five of these existed in the Vite app's `useFlowStream.ts`,
 * used only to dodge stale closures in `useCallback`s with empty/stable
 * dependency arrays) — see `.cursor/skills/sans-effect/SKILL.md`. Writing
 * to a ref during render, unconditionally and idempotently, never affects
 * the rendered output and is the React-sanctioned way to "stash the
 * latest value for use in callbacks" (the same shape as lazy `useState`
 * init) — it does not need an effect because refs are not part of the
 * committed render tree.
 *
 * Callers may still mutate `.current` directly outside of render (e.g.
 * from an event handler that must get ahead of a not-yet-committed Redux
 * dispatch) — the next render's mirror write is a no-op once the mirrored
 * value catches up, so manual writes and the mirror never fight as long
 * as a dispatch always follows the manual write (true for every call site
 * this hook replaces).
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
