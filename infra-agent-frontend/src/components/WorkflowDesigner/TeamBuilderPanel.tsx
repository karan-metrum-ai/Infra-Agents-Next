"use client";

import type { ChangeEvent } from "react";
import { Layers, X } from "lucide-react";
import styles from "./TeamBuilderPanel.module.css";
import type { TeamBuilderPanelProps } from "./TeamBuilderPanel.types";

/**
 * Inline team-name + cluster chip for `AppPageShell`'s `leadingExtra` slot.
 * No second navbar — the shell already owns brand/title chrome.
 */
export function TeamBuilderPanel({
  teamName,
  onTeamNameChange,
  selectedClusterId,
  onClearCluster,
}: TeamBuilderPanelProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onTeamNameChange(event.target.value);
  };

  return (
    <div className={styles.inlineControls}>
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
  );
}

export default TeamBuilderPanel;
