"use client";

import { useCallback, useState, type MouseEvent, type WheelEvent } from "react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const WHEEL_ZOOM_FACTOR = -0.001;

export interface DiagramZoomPan {
  zoomLevel: number;
  panPosition: { x: number; y: number };
  isPanning: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  handleWheel: (event: WheelEvent<HTMLDivElement>) => void;
  handleMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
}

/**
 * Pan/zoom interaction state for the fullscreen Mermaid diagram viewer.
 * Every caller only ever mounts the fullscreen overlay component while
 * `isFullscreen` is true (conditional rendering), so a fresh instance of
 * this hook's local state is exactly what a re-open needs — no reset
 * effect required (see `.cursor/skills/sans-effect` Pattern 5).
 */
export function useDiagramZoomPan(): DiagramZoomPan {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const zoomIn = useCallback(
    () => setZoomLevel((prev) => Math.min(prev + ZOOM_STEP, MAX_ZOOM)),
    [],
  );
  const zoomOut = useCallback(
    () => setZoomLevel((prev) => Math.max(prev - ZOOM_STEP, MIN_ZOOM)),
    [],
  );
  const resetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoomLevel((prev) =>
      Math.min(Math.max(prev + event.deltaY * WHEEL_ZOOM_FACTOR, MIN_ZOOM), MAX_ZOOM),
    );
  }, []);

  const handleMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      setIsPanning(true);
      setPanStart({ x: event.clientX - panPosition.x, y: event.clientY - panPosition.y });
    },
    [panPosition],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      setPanPosition((prev) => {
        if (!isPanning) return prev;
        return { x: event.clientX - panStart.x, y: event.clientY - panStart.y };
      });
    },
    [isPanning, panStart],
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  return {
    zoomLevel,
    panPosition,
    isPanning,
    zoomIn,
    zoomOut,
    resetZoom,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
