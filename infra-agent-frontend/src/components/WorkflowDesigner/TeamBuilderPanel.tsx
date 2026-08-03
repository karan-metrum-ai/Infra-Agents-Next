"use client";

import type { ChangeEvent } from "react";
import { Layers, X } from "lucide-react";
import styles from "./TeamBuilderPanel.module.css";
import type { TeamBuilderPanelProps } from "./TeamBuilderPanel.types";

/**
 * Top-left floating pill below the shared `LiveDashboardShell` bar (mounted
 * by `app/workflows/layout.tsx`, which already provides the hamburger/logo/
 * avatar): the editable team-name input and, once a cluster is picked, a
 * dismissible cluster indicator chip.
 */
export function TeamBuilderPanel({
  teamName,
  onTeamNameChange,
  selectedClusterId,
  onClearCluster,
}: TeamBuilderPanelProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    // Always pass the exact value, including empty strings, so backspace
    // can clear the input completely.
    onTeamNameChange(event.target.value);
  };

  return (
    <div className={styles.teamBuilderPanel}>
      <div className={styles.teamHeader}>
        <h1 className={styles.title}>Team Builder</h1>
        <div className={styles.divider} />
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={teamName ?? ""}
            onChange={handleInputChange}
            className={styles.teamNameInput}
            placeholder="Enter team name..."
            autoComplete="off"
            spellCheck={false}
            aria-label="Team name"
          />
          <div className={styles.divider} />
          {selectedClusterId && (
            <div className={styles.clusterIndicator}>
              <Layers className={styles.clusterIndicatorIcon} aria-hidden="true" />
              <span className={styles.clusterIndicatorText}>Cluster {selectedClusterId}</span>
              {onClearCluster && (
                <button
                  type="button"
                  onClick={onClearCluster}
                  className={styles.clusterClearButton}
                  aria-label="Clear cluster selection"
                >
                  <X aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamBuilderPanel;
