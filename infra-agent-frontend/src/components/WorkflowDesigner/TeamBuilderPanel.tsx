"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import { Layers, X } from "lucide-react";
import { CenterNavPanel } from "@/components/CenterNavPanel/CenterNavPanel";
import styles from "./TeamBuilderPanel.module.css";
import type { TeamBuilderPanelProps } from "./TeamBuilderPanel.types";

/**
 * Top-left floating pill: brand mark, global nav, the editable team-name
 * input, and (once a cluster is picked) a dismissible cluster indicator
 * chip. Renders inside `FloatingPanel` at `position="top-left"` by its
 * parent (a later Phase 7 orchestrator).
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
        <CenterNavPanel />
        <Image
          src="/metrum-logo-white.webp"
          alt="Metrum AI"
          width={120}
          height={28}
          className={styles.logo}
          priority
          decoding="async"
        />
        <Image
          src="/android-chrome-512x512.png"
          alt="Metrum AI"
          width={22}
          height={22}
          className={styles.logoIcon}
          decoding="async"
        />
        <div className={`${styles.divider} ${styles.brandDivider}`} />
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
