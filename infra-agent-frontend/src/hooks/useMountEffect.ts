import { useEffect, type EffectCallback } from "react";

/**
 * The single sanctioned direct `useEffect` call in this codebase — see
 * `.cursor/skills/sans-effect/SKILL.md`. Runs `effect` exactly once on
 * mount (and its returned cleanup, if any, exactly once on unmount).
 *
 * Reserved for genuine mount-time external-system sync — DOM integration,
 * third-party widget lifecycles, browser API subscriptions (e.g. a
 * `window` custom-event listener). Never reach for this to derive state,
 * fetch data, relay a user action, or reset state on a prop/id change —
 * each of those has a better dedicated pattern in the skill doc.
 */
export function useMountEffect(effect: EffectCallback): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: this wrapper's sole purpose is a stable, mount-only effect with no reactive dependencies.
  useEffect(effect, []);
}
