import { useEffect, useRef, useState } from "react";

/**
 * Open/closed state for the v1 legacy `ReasoningBlock`.
 *
 * Behavior: forces the accordion open while `streaming` is true; once
 * streaming ends, snaps to `defaultOpen` — but a manual toggle click
 * made *while* streaming must stick until the next streaming
 * transition (matches the Vite original exactly).
 *
 * This is a documented `.cursor/skills/sans-effect` exception, not a
 * plain derive-inline case: the "was previously streaming" transition
 * must be remembered across renders without itself causing one (ref,
 * not state), and a `key`-based remount (Pattern 5) was rejected
 * because it would also remount the `AnimatePresence` body, discarding
 * its enter/exit transition on every streaming boundary instead of
 * just resetting the toggle value.
 */
export function useReasoningToggleState(
  streaming: boolean,
  defaultOpen: boolean,
): [boolean, (next: boolean) => void] {
  const [isOpen, setIsOpen] = useState(streaming || defaultOpen);
  const wasStreamingRef = useRef(streaming);

  useEffect(() => {
    if (streaming) {
      setIsOpen(true);
      wasStreamingRef.current = true;
    } else if (wasStreamingRef.current) {
      setIsOpen(defaultOpen);
      wasStreamingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts only to the streaming transition, not defaultOpen
  }, [streaming]);

  return [isOpen, setIsOpen];
}
