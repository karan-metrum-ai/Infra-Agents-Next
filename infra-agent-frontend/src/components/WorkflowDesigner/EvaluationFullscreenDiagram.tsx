"use client";

import { Maximize, X, ZoomIn, ZoomOut } from "lucide-react";
import { useDiagramZoomPan } from "./useDiagramZoomPan";
import styles from "./EvaluationModal.module.css";

interface EvaluationFullscreenDiagramProps {
  svgHtml: string;
  onClose: () => void;
}

/**
 * Fullscreen Mermaid viewer with wheel-zoom + drag-to-pan. Only ever
 * mounted by the parent while `isFullscreen` is true, so its zoom/pan hook
 * seeds fresh state on every open with no reset effect needed (Pattern 5).
 */
export function EvaluationFullscreenDiagram({
  svgHtml,
  onClose,
}: EvaluationFullscreenDiagramProps) {
  const {
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
  } = useDiagramZoomPan();

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- backdrop-click-to-close is a supplemental mouse affordance; the Exit Fullscreen button already covers keyboard/screen-reader users.
    <div className={styles.modalOverlay} style={{ zIndex: 10002 }} onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- this onClick only stops the backdrop's close-on-click from bubbling up; it adds no new interaction of its own, so no keyboard equivalent is needed. */}
      <div
        className={styles.fullscreenDiagramModal}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- matches this feature's established dialog pattern (see EvaluationModal.tsx); a styled div + focus management is used in place of the native `<dialog>` element throughout this codebase.
        role="dialog"
        aria-modal="true"
        aria-label="Execution flow diagram, fullscreen"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.fullscreenOverlay}>
          <div className={styles.fullscreenControls}>
            <button type="button" onClick={onClose} className={styles.exitFullscreenButton}>
              <X size={24} aria-hidden="true" />
              Exit Fullscreen
            </button>
            <div className={styles.zoomControls}>
              <button
                type="button"
                onClick={zoomOut}
                className={styles.zoomButton}
                disabled={zoomLevel <= 0.5}
                aria-label="Zoom out"
              >
                <ZoomOut size={20} aria-hidden="true" />
              </button>
              <span className={styles.zoomLevel}>{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={zoomIn}
                className={styles.zoomButton}
                disabled={zoomLevel >= 3}
                aria-label="Zoom in"
              >
                <ZoomIn size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className={styles.zoomButton}
                aria-label="Reset zoom"
              >
                <Maximize size={20} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- this is a graphical pan/zoom viewport (mouse-drag + wheel), not a widget with standard interactive semantics; the zoom buttons above are the keyboard-operable equivalent, so no ARIA role would accurately describe this surface. */}
        <div
          className={styles.fullscreenMermaidContent}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
        >
          <div
            className={styles.mermaidWrapper}
            style={{
              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
              transition: isPanning ? "none" : "transform 0.2s ease-out",
            }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        </div>
      </div>
    </div>
  );
}

export default EvaluationFullscreenDiagram;
