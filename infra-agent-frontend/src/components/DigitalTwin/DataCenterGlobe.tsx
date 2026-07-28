"use client";

/**
 * DataCenterGlobe Component
 *
 * Interactive 3D globe showing data center locations worldwide.
 * Uses react-globe.gl for premium 3D visualization with:
 * - Per-marker colors based on health status
 * - Native tooltips on hover
 * - Automatic marker visibility culling (hides markers behind globe)
 * - Smooth animations and interactions
 *
 * Features:
 * - Rotating globe with health-status-colored markers
 * - Hover tooltips with site details
 * - Click to navigate to site
 * - Search/filter sites
 * - Stats panel with totals
 * - Red pulsating markers for unhealthy sites
 * - Green markers for healthy sites
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import { AlertTriangle, Hash, LayoutList } from "lucide-react";
import type { GlobeSite } from "./types";
import type { DataCenterGlobeProps, GlobePointData } from "./DataCenterGlobe.types";
import { buildSiteTooltipHtml } from "./globeSiteTooltip";
import { getRingGradient } from "./globeHealthTheme";
import { GlobeErrorBoundary } from "./GlobeErrorBoundary";
import { GlobeSiteListPanel } from "./GlobeSiteListPanel";
import { GlobeStatsPanel } from "./GlobeStatsPanel";
import { useGlobeDimensions } from "./useGlobeDimensions";
import { useGlobePointsData } from "./useGlobePointsData";
import { buildGlobeMarkerEl, type GlobeTipMode } from "@/utils/globeMarkerHtml";
import { getDisplayLat, getDisplayLng } from "@/utils/globeMarkerOffsets";
import styles from "./DataCenterGlobe.module.css";

// Detect WebGL2 support once at module level.
// Cached so the check canvas is created only once.
let _webglAvailable: boolean | null = null;
function isWebGLAvailable(): boolean {
  if (_webglAvailable !== null) return _webglAvailable;
  try {
    const c = document.createElement("canvas");
    const ctx = c.getContext("webgl2") || c.getContext("webgl");
    _webglAvailable = ctx != null;
    if (ctx) {
      const ext = (ctx as WebGLRenderingContext).getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
    }
  } catch {
    _webglAvailable = false;
  }
  return _webglAvailable;
}

export function DataCenterGlobe({
  sites,
  onSiteClick,
  hideNavigation = false,
  hideSiteListPanel = false,
  hideStatsPanel = false,
  disableMarkerClick = false,
  hideInstructions = false,
  selectedSiteId = null,
  enablePersistentTips = false,
}: DataCenterGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const onSiteClickRef = useRef(onSiteClick);
  onSiteClickRef.current = onSiteClick;

  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<GlobePointData | null>(null);
  const [tipMode, setTipMode] = useState<GlobeTipMode>("detail");

  const dimensions = useGlobeDimensions(containerRef);
  const { displayCoords, pointsData, ringsData, issueSites, globeSites } = useGlobePointsData(
    sites,
    hoveredPoint,
  );

  // Configure globe on mount.
  useEffect(() => {
    if (globeRef.current) {
      // Closer altitude so the sphere fills more of the viewport
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 1.85 });

      // Enable auto-rotation
      const controls = globeRef.current.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;

      // Enable smooth damping
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;

      setIsLoaded(true);
    }
  }, []);

  const handlePointClick = useCallback(
    (point: GlobePointData) => {
      if (!disableMarkerClick && point.site) {
        onSiteClick(point.site);
      }
    },
    [disableMarkerClick, onSiteClick],
  );

  const handlePointHover = useCallback((point: object | null) => {
    setHoveredPoint(point ? (point as GlobePointData) : null);
  }, []);

  const getPointRadius = useCallback(
    (d: object) => {
      const point = d as GlobePointData;
      const isHovered = hoveredPoint?.site.id === point.site.id;
      return isHovered ? point.size * 1.28 : point.size;
    },
    [hoveredPoint],
  );

  const getPointLabel = useCallback(
    (point: GlobePointData) =>
      buildSiteTooltipHtml(point.site, point.healthStatus, disableMarkerClick),
    [disableMarkerClick],
  );

  const htmlElement = useCallback(
    (d: object) => {
      const site = d as GlobeSite;
      return buildGlobeMarkerEl(
        site,
        selectedSiteId != null && site.id === selectedSiteId,
        tipMode,
        (next) => onSiteClickRef.current(next),
        disableMarkerClick,
      );
    },
    [selectedSiteId, tipMode, disableMarkerClick],
  );

  const persistentRingsData = useMemo(
    () =>
      issueSites.map((site) => ({
        lat: getDisplayLat(site, displayCoords),
        lng: getDisplayLng(site, displayCoords),
        maxR: 2.8,
        propagationSpeed: 2.2,
        repeatPeriod: 1200,
        color: getRingGradient(site.healthStatus || "unknown"),
        site,
      })),
    [issueSites, displayCoords],
  );

  // Bail out early if the browser has WebGL disabled -- avoids the
  // uncaught TypeError inside THREE.js's minified error path. Computed
  // unconditionally above every hook so hook order never changes.
  const webglAvailable = isWebGLAvailable();

  if (!webglAvailable) {
    return (
      <div className={styles.webglFallback} role="alert">
        <AlertTriangle size={36} className={styles.webglFallbackIcon} aria-hidden="true" />
        <span className={styles.webglFallbackText}>
          3D globe could not be rendered -- WebGL is not available.
        </span>
        <span className={styles.webglFallbackHint}>
          Try a hard refresh (Ctrl+Shift+R) or restart the browser.
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.globeRoot}>
      <div className={styles.bgLayer} />
      <div className={styles.gradientOverlay} />
      <div className={styles.gridPattern} />
      <div
        className={`${styles.globeGlow} ${isLoaded ? styles.globeGlowVisible : styles.globeGlowHidden}`}
      />

      {enablePersistentTips && (
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would add a visible border/legend that doesn't fit this pill toggle
        <div className={styles.tipToggle} role="group" aria-label="Popup view">
          <button
            type="button"
            className={`${styles.tipToggleBtn} ${tipMode === "mini" ? styles.tipToggleActive : ""}`}
            onClick={() => setTipMode("mini")}
            title="Mini popup — issue count"
            aria-pressed={tipMode === "mini"}
          >
            <Hash size={13} strokeWidth={2.25} aria-hidden="true" />
            Mini
          </button>
          <button
            type="button"
            className={`${styles.tipToggleBtn} ${tipMode === "detail" ? styles.tipToggleActive : ""}`}
            onClick={() => setTipMode("detail")}
            title="Detailed popup"
            aria-pressed={tipMode === "detail"}
          >
            <LayoutList size={13} strokeWidth={2.25} aria-hidden="true" />
            Detail
          </button>
        </div>
      )}

      {/* Globe Container */}
      <div
        className={`${styles.globeContainer} ${isLoaded ? styles.globeContainerVisible : styles.globeContainerHidden}`}
      >
        <GlobeErrorBoundary>
          <Globe
            ref={globeRef}
            width={dimensions.width || 800}
            height={dimensions.height || 800}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="/assets/globe/earth-night.jpg"
            bumpImageUrl="/assets/globe/earth-topology.png"
            atmosphereColor="rgba(40, 130, 200, 0.55)"
            atmosphereAltitude={0.28}
            // Points layer — used when persistent HTML tips are off
            pointsData={enablePersistentTips ? [] : pointsData}
            pointLat={(d: object) => (d as GlobePointData).lat}
            pointLng={(d: object) => (d as GlobePointData).lng}
            pointAltitude={0.008}
            pointRadius={getPointRadius}
            pointResolution={24}
            pointColor={(d: object) => (d as GlobePointData).color}
            pointLabel={
              enablePersistentTips ? undefined : (getPointLabel as (obj: object) => string)
            }
            onPointClick={
              enablePersistentTips
                ? undefined
                : (handlePointClick as (
                    point: object,
                    event: MouseEvent,
                    coords: { lat: number; lng: number; altitude: number },
                  ) => void)
            }
            onPointHover={enablePersistentTips ? undefined : handlePointHover}
            pointsMerge={false}
            // Always-visible HTML markers (detail / mini tips)
            htmlElementsData={enablePersistentTips ? globeSites : undefined}
            htmlLat={(d: object) => getDisplayLat(d as GlobeSite, displayCoords)}
            htmlLng={(d: object) => getDisplayLng(d as GlobeSite, displayCoords)}
            htmlAltitude={0.02}
            htmlElement={enablePersistentTips ? htmlElement : undefined}
            htmlTransitionDuration={0}
            // Rings layer for pulsating effect
            ringsData={enablePersistentTips ? persistentRingsData : ringsData}
            ringLat={(d: object) => (d as { lat: number }).lat}
            ringLng={(d: object) => (d as { lng: number }).lng}
            ringAltitude={0.012}
            ringResolution={96}
            ringColor={(d: object) => (d as { color: string | string[] }).color}
            ringMaxRadius={(d: object) => (d as { maxR: number }).maxR}
            ringPropagationSpeed={(d: object) =>
              (d as { propagationSpeed: number }).propagationSpeed
            }
            ringRepeatPeriod={(d: object) => (d as { repeatPeriod: number }).repeatPeriod}
          />
        </GlobeErrorBoundary>
      </div>

      {/* Bottom instructions */}
      {!hideInstructions && (
        <div
          className={`${styles.instructionsPanel} ${hideStatsPanel ? styles.instructionsPanelNoStats : styles.instructionsPanelWithStats} ${
            isLoaded ? styles.instructionsPanelVisible : styles.instructionsPanelHidden
          }`}
        >
          <div className={styles.instructionsPill}>
            <p className={styles.instructionsText}>
              {disableMarkerClick
                ? "Drag to rotate - Hover over markers to view details"
                : "Drag to rotate - Click on a marker to view the data center"}
            </p>
          </div>
        </div>
      )}

      {!hideSiteListPanel && (
        <GlobeSiteListPanel
          sites={sites}
          onSiteClick={onSiteClick}
          hideNavigation={hideNavigation}
          selectedSiteId={selectedSiteId}
          isLoaded={isLoaded}
        />
      )}

      {!hideStatsPanel && <GlobeStatsPanel sites={sites} isLoaded={isLoaded} />}
    </div>
  );
}

export default DataCenterGlobe;
