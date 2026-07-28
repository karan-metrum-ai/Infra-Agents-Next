/**
 * Unit tests for aspect-aware FOV compensation.
 */

import { describe, expect, it } from "vitest";
import { computeAspectFov } from "./aspectFov";

const DESIGN_ASPECT = 16 / 9;

describe("computeAspectFov", () => {
  it("is an identity at the design aspect ratio", () => {
    expect(computeAspectFov(50, DESIGN_ASPECT)).toBeCloseTo(50, 5);
  });

  it("is an identity for aspects narrower than the design (e.g. portrait tablet)", () => {
    expect(computeAspectFov(50, 4 / 3)).toBe(50);
    expect(computeAspectFov(50, 3 / 4)).toBe(50);
  });

  it("reduces vertical FOV as aspect widens, to hold horizontal FOV constant", () => {
    const at169 = computeAspectFov(50, DESIGN_ASPECT);
    const at219 = computeAspectFov(50, 2560 / 1080);
    const at329 = computeAspectFov(50, 5120 / 1440);
    expect(at219).toBeLessThan(at169);
    expect(at329).toBeLessThan(at219);
  });

  it("never distorts the horizontal FOV it targets", () => {
    // The horizontal FOV implied by (adjusted vertical fov, actual aspect)
    // should match the horizontal FOV implied by (base fov, design aspect).
    const baseFov = 65;
    const aspect = 32 / 9;
    const adjusted = computeAspectFov(baseFov, aspect);

    const hFovAt = (vFovDeg: number, a: number) =>
      2 * Math.atan(Math.tan((vFovDeg * Math.PI) / 180 / 2) * a);

    const designHFov = hFovAt(baseFov, DESIGN_ASPECT);
    const adjustedHFov = hFovAt(adjusted, aspect);
    expect(adjustedHFov).toBeCloseTo(designHFov, 5);
  });

  it("never returns a value below the safety floor even for extreme aspects", () => {
    expect(computeAspectFov(50, 100)).toBeGreaterThanOrEqual(10);
  });

  it("handles non-finite input defensively", () => {
    expect(computeAspectFov(50, Number.NaN)).toBe(50);
    expect(computeAspectFov(50, Number.POSITIVE_INFINITY)).toBeGreaterThanOrEqual(10);
  });
});
