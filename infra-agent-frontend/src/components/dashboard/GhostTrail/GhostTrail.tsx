"use client";

/**
 * GhostTrail
 *
 * Renders a subtle, continuous neon-ribbon flow connecting the active agent
 * card on the right side of the split view to the rack on the left side.
 *
 * Design intent (artistic, not flashy):
 *   - Three thin glowing ribbons trace gentle arcs from right to left.
 *   - Soft particles drift along the main ribbon to suggest data movement
 *     without ever feeling like a "burst" or "impact".
 *   - Endpoints have a soft static glow (no aggressive pulsing rings).
 *   - The whole layer fades in/out smoothly when the activity state
 *     transitions, never with a one-shot flash.
 *
 * Purely decorative — the whole overlay is `aria-hidden` and conveys no
 * information a screen reader user would need.
 *
 * The `trigger` prop is kept for API compatibility with the parent but is
 * intentionally not used to fire any one-shot bursts — the visualization is
 * fully continuous while `active` is true.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./GhostTrail.module.css";
import type { GhostTrailProps } from "./GhostTrail.types";

// Endpoint coordinates expressed as percentages of the container.
const START_X_PCT = 0.78;
const START_Y_PCT = 0.5;
const END_X_PCT = 0.22;
const END_Y_PCT = 0.55;
// Arc lift: pulled up so the curve clearly arcs over the middle.
const CONTROL_X_PCT = 0.5;
const CONTROL_Y_PCT = 0.22;

// Number of parallel ribbons. Three reads as "a few strands of energy"
// without becoming visually noisy.
const RIBBON_COUNT = 3;
// Soft particles drifting along the main ribbon.
const PARTICLE_COUNT = 5;

interface RibbonGeometry {
  d: string;
  index: number;
}

interface TrailGeometry {
  w: number;
  h: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ribbons: RibbonGeometry[];
  mainPath: string;
}

function buildPath(
  startX: number,
  startY: number,
  ctrlX: number,
  ctrlY: number,
  endX: number,
  endY: number,
): string {
  return `M ${startX} ${startY} Q ${ctrlX} ${ctrlY}, ${endX} ${endY}`;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return reduced;
}

export function GhostTrail({ active }: GhostTrailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const prefersReducedMotion = usePrefersReducedMotion();

  // Track parent size so the SVG viewBox uses real pixel coords. This
  // keeps circles + stroke widths from getting squished.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geometry = useMemo<TrailGeometry | null>(() => {
    const { w, h } = size;
    if (w === 0 || h === 0) return null;

    const startX = w * START_X_PCT;
    const startY = h * START_Y_PCT;
    const endX = w * END_X_PCT;
    const endY = h * END_Y_PCT;
    const ctrlX = w * CONTROL_X_PCT;
    const ctrlY = h * CONTROL_Y_PCT;

    // Build N parallel ribbons by perturbing the control point's y so
    // they fan slightly at the apex but converge at endpoints.
    const ribbonSpread = Math.max(18, h * 0.045);
    const ribbons: RibbonGeometry[] = [];
    const center = (RIBBON_COUNT - 1) / 2;
    for (let i = 0; i < RIBBON_COUNT; i++) {
      const norm = (i - center) / center;
      const dy = norm * ribbonSpread;
      ribbons.push({
        d: buildPath(startX, startY + dy * 0.15, ctrlX, ctrlY + dy, endX, endY + dy * 0.15),
        index: i,
      });
    }

    const mainPath = ribbons[Math.floor(RIBBON_COUNT / 2)].d;
    return {
      w,
      h,
      startX,
      startY,
      endX,
      endY,
      ribbons,
      mainPath,
    };
  }, [size]);

  return (
    <div
      ref={containerRef}
      className={`${styles.overlay} ${active ? styles.overlayActive : ""}`}
      aria-hidden="true"
    >
      {geometry && active && (
        <svg
          className={styles.svg}
          viewBox={`0 0 ${geometry.w} ${geometry.h}`}
          preserveAspectRatio="none"
          width={geometry.w}
          height={geometry.h}
        >
          <defs>
            {/* Soft glow blur for the small drifting particles. */}
            <filter id="ghost-trail-particle-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Endpoint halo blur — much softer than a pulsing ring. */}
            <filter id="ghost-trail-endpoint-glow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="6" />
            </filter>

            {/* Ribbon stroke gradient: faint at the source side, slightly
                brighter as it approaches the rack to suggest direction
                without harsh contrast. */}
            <linearGradient id="ghost-trail-ribbon" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(34, 211, 238, 0)" />
              <stop offset="20%" stopColor="rgba(34, 211, 238, 0.18)" />
              <stop offset="55%" stopColor="rgba(125, 220, 240, 0.32)" />
              <stop offset="90%" stopColor="rgba(186, 230, 253, 0.45)" />
              <stop offset="100%" stopColor="rgba(186, 230, 253, 0)" />
            </linearGradient>

            {/* Soft halo gradient for endpoint glow. */}
            <radialGradient id="ghost-trail-endpoint">
              <stop offset="0%" stopColor="rgba(186, 230, 253, 0.55)" />
              <stop offset="60%" stopColor="rgba(34, 211, 238, 0.18)" />
              <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
            </radialGradient>
          </defs>

          {/* Soft static endpoint halos — no pulsing rings. */}
          <circle
            cx={geometry.startX}
            cy={geometry.startY}
            r={26}
            fill="url(#ghost-trail-endpoint)"
            filter="url(#ghost-trail-endpoint-glow)"
            className={styles.endpointHalo}
          />
          <circle
            cx={geometry.endX}
            cy={geometry.endY}
            r={32}
            fill="url(#ghost-trail-endpoint)"
            filter="url(#ghost-trail-endpoint-glow)"
            className={styles.endpointHalo}
          />

          {/* Three thin neon ribbons. Center ribbon is the main path used
              by particles; outer ribbons are dimmer and offset slightly
              for organic depth. */}
          {geometry.ribbons.map((ribbon) => {
            const isCenter = ribbon.index === Math.floor(RIBBON_COUNT / 2);
            return (
              <path
                key={`ribbon-${ribbon.index}`}
                d={ribbon.d}
                fill="none"
                stroke="url(#ghost-trail-ribbon)"
                strokeWidth={isCenter ? 1.4 : 0.8}
                strokeLinecap="round"
                className={styles.ribbon}
                style={{
                  opacity: isCenter ? 0.85 : 0.4,
                  filter:
                    "drop-shadow(0 0 4px rgba(125, 220, 240, 0.45)) " +
                    "drop-shadow(0 0 10px rgba(34, 211, 238, 0.25))",
                  animationDelay: `${ribbon.index * 1.4}s`,
                }}
              />
            );
          })}

          {/* Drifting particles — small, soft, staggered so the ribbon
              always has gentle motion without ever feeling busy. Skipped
              entirely under prefers-reduced-motion; the ribbons + endpoint
              halos alone are the static fallback. */}
          {!prefersReducedMotion &&
            Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
              const dur = 4.2;
              const begin = -(i * (dur / PARTICLE_COUNT));
              return (
                <circle
                  key={`particle-${i}`}
                  r={2.2}
                  fill="rgba(186, 230, 253, 0.85)"
                  filter="url(#ghost-trail-particle-glow)"
                  className={styles.particle}
                >
                  <animateMotion
                    dur={`${dur}s`}
                    repeatCount="indefinite"
                    begin={`${begin}s`}
                    rotate="auto"
                    path={geometry.mainPath}
                    keyTimes="0;1"
                    keySplines="0.4 0 0.6 1"
                    calcMode="spline"
                  />
                </circle>
              );
            })}
        </svg>
      )}
    </div>
  );
}
