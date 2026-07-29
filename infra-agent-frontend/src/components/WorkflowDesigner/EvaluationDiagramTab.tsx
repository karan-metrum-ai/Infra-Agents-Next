"use client";

import { Activity, AlertCircle, Loader2, Maximize2, Minimize2 } from "lucide-react";
import styles from "./EvaluationModal.module.css";

interface EvaluationDiagramTabProps {
  mermaidDiagram: string | null;
  svgHtml: string;
  renderError: string | null;
  isLoading: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

/** "Execution Flow" tab: renders the sanitized Mermaid SVG produced by
 * `useMermaidDiagramRenderer` (owned by the parent, so the same rendered
 * markup can be reused by the fullscreen viewer without re-rendering). */
export function EvaluationDiagramTab({
  mermaidDiagram,
  svgHtml,
  renderError,
  isLoading,
  isFullscreen,
  onToggleFullscreen,
}: EvaluationDiagramTabProps) {
  return (
    <div className={styles.diagramTab}>
      <div className={styles.diagramControls}>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className={styles.fullscreenButton}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          disabled={!mermaidDiagram}
        >
          {isFullscreen ? (
            <Minimize2 size={20} aria-hidden="true" />
          ) : (
            <Maximize2 size={20} aria-hidden="true" />
          )}
          <span className={styles.buttonText}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </span>
        </button>
      </div>

      {renderError ? (
        <div className={styles.diagramPlaceholder} role="alert">
          <div className={styles.diagramLoadingSpinner}>
            <AlertCircle size={56} className={styles.errorIconLarge} aria-hidden="true" />
            <h3 className={styles.placeholderTitle}>Diagram Render Error</h3>
            <p className={styles.placeholderText}>{renderError}</p>
          </div>
        </div>
      ) : mermaidDiagram && svgHtml ? (
        <div className={styles.diagramContainer}>
          <div className={styles.mermaidWrapper} dangerouslySetInnerHTML={{ __html: svgHtml }} />
        </div>
      ) : (
        <div className={styles.diagramPlaceholder}>
          <div className={styles.diagramLoadingSpinner}>
            {isLoading ? (
              <>
                <Activity size={56} className={styles.placeholderIcon} aria-hidden="true" />
                <Loader2 size={32} className={styles.loadingIcon} aria-hidden="true" />
                <h3 className={styles.placeholderTitle}>Generating Workflow Visualization</h3>
                <p className={styles.placeholderText}>
                  KYAI is analyzing agent interactions and building an intelligent execution flow
                  diagram...
                </p>
              </>
            ) : (
              <>
                <Activity size={56} className={styles.placeholderIcon} aria-hidden="true" />
                <h3 className={styles.placeholderTitle}>Execution Flow Visualization</h3>
                <p className={styles.placeholderText}>
                  The execution flow diagram will appear here once evaluation data is available.
                  Start an evaluation to see the intelligent workflow visualization.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EvaluationDiagramTab;
