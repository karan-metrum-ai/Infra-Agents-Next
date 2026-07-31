"use client";

import { useState } from "react";
import { useMountEffect } from "@/hooks/useMountEffect";

/**
 * Ticks up by one every second for as long as the owning component stays
 * mounted. This is a genuine Pattern 4 case (`.cursor/skills/sans-effect`
 * SKILL.md) — a `setInterval` browser-timer subscription synced to a
 * component's lifecycle, not state derived from props/state (Pattern 1),
 * a data fetch (Pattern 2), or a user action (Pattern 3).
 *
 * Callers must only mount the component using this hook while the timed
 * operation is actually in flight (conditional rendering, per the skill's
 * "parents own lifecycle boundaries" guidance) — e.g.
 * `BulkUploadStepper`'s uploading phase renders a small ticker
 * sub-component only while `phase === 'uploading'`, so it mounts fresh
 * (starting back at 0) every time a new upload begins and unmounts
 * (clearing the interval) the moment the phase changes, with no manual
 * `key` or reset effect required.
 */
export function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0);

  useMountEffect(() => {
    const id = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(id);
  });

  return seconds;
}
