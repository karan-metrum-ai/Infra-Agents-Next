"use client";

import { useEffect, useId, useState } from "react";
import DOMPurify from "dompurify";
import { useMountEffect } from "@/hooks/useMountEffect";

export interface MermaidDiagramRenderer {
  /** Sanitized SVG markup, ready for `dangerouslySetInnerHTML` — shared by
   * both the inline diagram tab and the fullscreen viewer so mermaid only
   * ever renders once per diagram change. */
  svgHtml: string;
  renderError: string | null;
  isRendering: boolean;
}

function resolveThemeColor(cssVariable: string): string {
  if (typeof window === "undefined") return "inherit";
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVariable).trim();
  return value.length > 0 ? value : "inherit";
}

/**
 * Owns Mermaid's imperative render lifecycle: one-time theme
 * initialization plus re-rendering the diagram into sanitized SVG whenever
 * the source text or tab visibility changes.
 *
 * This is the **one sanctioned place in this feature with a direct
 * `useEffect` call** (see `.cursor/skills/sans-effect/SKILL.md`, Pattern
 * 4 — genuine external-library DOM sync): `mermaid.render()` is an
 * imperative, async, third-party rendering call with no declarative
 * equivalent, and its result must re-sync whenever `diagram`/`isActive`
 * change over the component's lifetime (not just on mount), which rules
 * out `useMountEffect`.
 *
 * `mermaid` is loaded via a dynamic `import()` (Phase 15) rather than a
 * static top-level import — it's a genuinely heavy, diagram-rendering
 * library only actually needed once this hook's owning component mounts
 * (the evaluation diagram tab), per Next's own "Loading External
 * Libraries" lazy-loading pattern (`next/dynamic` itself only wraps React
 * *components*; a plain library needs the `import()` form directly). The
 * module resolves from the bundler's own module cache on the second call
 * (theme init vs. render), so calling `import("mermaid")` in both effects
 * below does not re-fetch it twice.
 *
 * Theme colors are resolved from the app's real CSS custom properties at
 * render time (`resolveThemeColor`) rather than hardcoded hex, since
 * Mermaid's `themeVariables` API requires literal color strings and can't
 * consume `var(--token)` references directly — this keeps the "zero
 * hardcoded colors" rule intact even though Mermaid itself renders outside
 * the app's normal CSS cascade.
 */
export function useMermaidDiagramRenderer(
  diagram: string | null,
  isActive: boolean,
): MermaidDiagramRenderer {
  const renderId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const [svgHtml, setSvgHtml] = useState("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  useMountEffect(() => {
    let cancelled = false;
    import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "dark",
        themeVariables: {
          primaryColor: resolveThemeColor("--color-brand"),
          primaryTextColor: resolveThemeColor("--color-text-primary"),
          primaryBorderColor: resolveThemeColor("--primary-600"),
          lineColor: resolveThemeColor("--color-text-muted"),
          secondaryColor: resolveThemeColor("--color-surface-hover"),
          tertiaryColor: resolveThemeColor("--color-surface-sunken"),
          background: resolveThemeColor("--color-bg"),
          mainBkg: resolveThemeColor("--color-surface"),
          secondBkg: resolveThemeColor("--color-surface-raised"),
          tertiaryBkg: resolveThemeColor("--color-surface-sunken"),
          secondaryBorderColor: resolveThemeColor("--color-border"),
          tertiaryBorderColor: resolveThemeColor("--color-border-strong"),
          clusterBkg: resolveThemeColor("--color-surface"),
          clusterBorder: resolveThemeColor("--color-border"),
          defaultLinkColor: resolveThemeColor("--color-text-muted"),
          titleColor: resolveThemeColor("--color-text-primary"),
          edgeLabelBackground: resolveThemeColor("--color-surface"),
          nodeTextColor: resolveThemeColor("--color-text-primary"),
        },
      });
    });
    return () => {
      cancelled = true;
    };
  });

  useEffect(() => {
    if (!diagram || !isActive) {
      return undefined;
    }

    let cancelled = false;
    setIsRendering(true);

    import("mermaid")
      .then(({ default: mermaid }) => mermaid.render(`kyai-mermaid-${renderId}`, diagram))
      .then((result) => {
        if (cancelled) return;
        setSvgHtml(DOMPurify.sanitize(result.svg, { USE_PROFILES: { svg: true } }));
        setRenderError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSvgHtml("");
        setRenderError(err instanceof Error ? err.message : "Failed to render diagram");
      })
      .finally(() => {
        if (!cancelled) setIsRendering(false);
      });

    return () => {
      cancelled = true;
    };
  }, [diagram, isActive, renderId]);

  return { svgHtml, renderError, isRendering };
}
