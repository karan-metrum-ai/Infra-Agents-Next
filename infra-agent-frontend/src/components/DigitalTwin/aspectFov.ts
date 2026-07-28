/**
 * Aspect-aware field-of-view compensation for the 3D scenes.
 *
 * Camera FOVs throughout the digital twin are tuned as a *vertical* FOV
 * for a ~16:9 viewport. Left untouched, a fixed vertical FOV on an
 * ultrawide/super-ultrawide screen (react-three-fiber updates
 * `camera.aspect` automatically, but not `camera.fov`) reveals a wider
 * horizontal slice of the scene than the design intends -- the room
 * appears to float in a void with extra empty space on both sides.
 *
 * `computeAspectFov` keeps the *horizontal* FOV pinned to what it would
 * be at the design aspect ratio, and derives the vertical FOV needed to
 * hold that horizontal FOV as the viewport widens. This does not
 * distort geometry (perspective projection stays correct for the
 * actual aspect) and does not require touching per-frame camera logic
 * -- callers fold it into whatever vertical FOV they already use.
 */

const DESIGN_ASPECT = 16 / 9;
const MIN_FOV_DEG = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Returns the vertical FOV (degrees) that keeps the horizontal FOV
 * equal to what `baseVFovDeg` would produce at `baseAspect`, for the
 * given (wider) `aspect`. Identity (returns `baseVFovDeg` unchanged)
 * when `aspect <= baseAspect`, so normal/narrower screens are unaffected.
 */
export function computeAspectFov(
  baseVFovDeg: number,
  aspect: number,
  baseAspect: number = DESIGN_ASPECT,
): number {
  if (!Number.isFinite(aspect) || aspect <= baseAspect) {
    return baseVFovDeg;
  }
  const baseHalfHFov = Math.atan(Math.tan(toRad(baseVFovDeg) / 2) * baseAspect);
  const halfVFov = Math.atan(Math.tan(baseHalfHFov) / aspect);
  return Math.max(MIN_FOV_DEG, toDeg(halfVFov) * 2);
}
