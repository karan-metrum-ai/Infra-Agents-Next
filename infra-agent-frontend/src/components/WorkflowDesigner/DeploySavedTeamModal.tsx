"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetClusterTeamsQuery, useGetTeamsQuery } from "@/features/teams/teamsApi";
import type { TeamListItem } from "@/features/teams/teamsApi.types";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import styles from "./DeploySavedTeamModal.module.css";
import type { DeploySavedTeamModalProps } from "./DeploySavedTeamModal.types";

function getStatusBadge(team: TeamListItem) {
  if (team.is_deployed) {
    return (
      <span className={styles.statusBadgeDeployed}>
        <CheckCircle className={styles.statusBadgeIcon} aria-hidden="true" />
        Ready
      </span>
    );
  }
  if (team.status === "failed") {
    return (
      <span className={styles.statusBadgeFailed}>
        <AlertCircle className={styles.statusBadgeIcon} aria-hidden="true" />
        Failed
      </span>
    );
  }
  return (
    <span className={styles.statusBadgeReady}>
      <Circle className={styles.statusBadgeIcon} aria-hidden="true" />
      Not Deployed
    </span>
  );
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DeploySavedTeamModalContent({
  onClose,
  onLoadTeam,
}: Omit<DeploySavedTeamModalProps, "isOpen">) {
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);

  const {
    data: clusterTeamsData,
    isLoading: isLoadingClusters,
    error: clustersError,
  } = useGetClusterTeamsQuery();

  const {
    data: teamsData,
    isLoading: isLoadingTeams,
    isFetching: isFetchingTeams,
    error: teamsError,
  } = useGetTeamsQuery(
    selectedClusterId ? { cluster_id: selectedClusterId, limit: 100, offset: 0 } : undefined,
    { skip: !selectedClusterId, refetchOnMountOrArgChange: true },
  );

  const handleClusterSelect = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    setSelectedTeamId("");
  };

  const handleExpandClusters = () => {
    setSelectedClusterId("");
    setSelectedTeamId("");
  };

  const handleDeploy = () => {
    if (selectedClusterId && selectedTeamId) {
      onLoadTeam(selectedTeamId, selectedClusterId);
      onClose();
    }
  };

  const availableTeams = teamsData?.teams ?? [];
  const canLoadTeam = Boolean(selectedClusterId && selectedTeamId);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions, jsx-a11y/no-noninteractive-element-interactions -- backdrop-click-to-close is a supplemental mouse affordance; Escape (via handleKeyDown on the dialog itself) and the close button already cover keyboard/screen-reader users.
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- `onClick` stops backdrop-close clicks from bubbling past the dialog card; `onKeyDown` below is Escape-to-close/Tab-cycling via `useDialogFocusTrap`. Both are supplemental to the close button, which remains fully keyboard/screen-reader operable. */}
      <div
        ref={dialogRef}
        className={styles.modalContainer}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- this codebase's dialogs are styled divs + `useDialogFocusTrap` rather than the native `<dialog>` element, for consistent theming/animation across every modal.
        role="dialog"
        aria-modal="true"
        aria-labelledby="deploy-saved-team-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.modalHeader}>
          <div className={styles.headerText}>
            <h2 id="deploy-saved-team-modal-title" className={styles.modalTitle}>
              Load Team
            </h2>
            <p className={styles.modalSubtitle}>Select a cluster and team to load</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalContent}>
          {!selectedClusterId ? (
            <div className={styles.stepSection}>
              <div className={styles.stepHeader}>
                <span className={styles.stepLabel}>Target Cluster</span>
                {clusterTeamsData && (
                  <span className={styles.teamCount}>
                    {clusterTeamsData.active_teams.total_clusters}
                  </span>
                )}
              </div>
              {isLoadingClusters ? (
                <div className={styles.skeletonClusterGrid} aria-hidden="true">
                  <div className={styles.skeletonClusterCard} />
                  <div className={styles.skeletonClusterCard} />
                  <div className={styles.skeletonClusterCard} />
                  <div className={styles.skeletonClusterCard} />
                </div>
              ) : clustersError ? (
                <div className={styles.errorState} role="alert">
                  <p>Failed to load clusters</p>
                  <span>Check your connection and try again</span>
                </div>
              ) : !clusterTeamsData?.clusters?.length ? (
                <div className={styles.emptyState}>
                  <p>No clusters available</p>
                </div>
              ) : (
                <div className={styles.clusterGrid}>
                  {clusterTeamsData.clusters.map((item) => (
                    <button
                      key={item.cluster_info.cluster_id}
                      type="button"
                      onClick={() => handleClusterSelect(String(item.cluster_info.cluster_id))}
                      className={styles.clusterCard}
                      aria-label={`Cluster ${item.cluster_info.cluster_id}, ${item.cluster_info.device_count} device${item.cluster_info.device_count !== 1 ? "s" : ""}`}
                    >
                      <div className={styles.clusterRadio} aria-hidden="true" />
                      <div className={styles.clusterInfo}>
                        <span className={styles.clusterName}>
                          Cluster {item.cluster_info.cluster_id}
                        </span>
                        <span className={styles.clusterDeviceCount}>
                          {item.cluster_info.device_count} device
                          {item.cluster_info.device_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.stepSection}>
              <div className={styles.stepHeader}>
                <span className={styles.stepLabel}>Select Team</span>
                <div className={styles.selectedClusterChip}>
                  <span className={styles.selectedClusterText}>Cluster {selectedClusterId}</span>
                  <button
                    type="button"
                    onClick={handleExpandClusters}
                    className={styles.changeClusterButton}
                    aria-label="Change cluster"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {isLoadingTeams || isFetchingTeams ? (
                <div className={styles.skeletonTeamList} aria-hidden="true">
                  <div className={styles.skeletonTeamCard} />
                  <div className={styles.skeletonTeamCard} />
                  <div className={styles.skeletonTeamCard} />
                </div>
              ) : teamsError ? (
                <div className={styles.errorState} role="alert">
                  <p>Failed to load teams</p>
                  <span>Check your connection and try again</span>
                </div>
              ) : availableTeams.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No teams found for this cluster</p>
                </div>
              ) : (
                <div className={styles.teamsList} role="radiogroup" aria-label="Team">
                  {availableTeams.map((team) => {
                    const isSelected = selectedTeamId === team.team_id;
                    return (
                      <button
                        key={team.team_id}
                        type="button"
                        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom-styled selection card; a native `<input type="radio">` can't be skinned to this card layout without losing the design system's visual language.
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedTeamId(team.team_id)}
                        className={cn(styles.teamCard, isSelected && styles.teamCardSelected)}
                      >
                        <div className={styles.teamRadio} aria-hidden="true">
                          {isSelected && <div className={styles.teamRadioInner} />}
                        </div>
                        <div className={styles.teamCardContent}>
                          <div className={styles.teamHeader}>
                            <span className={styles.teamName}>{team.team_name}</span>
                            {getStatusBadge(team)}
                          </div>
                          {team.description && (
                            <p className={styles.teamDescription}>
                              {team.description.length > 100
                                ? `${team.description.slice(0, 100)}...`
                                : team.description}
                            </p>
                          )}
                          <div className={styles.teamMeta}>
                            <span className={styles.teamMetaItem}>
                              {team.agent_count} agent{team.agent_count !== 1 ? "s" : ""}
                            </span>
                            <span className={styles.teamMetaItem}>
                              {formatRelativeDate(team.created_at)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeploy}
            disabled={!canLoadTeam}
            className={styles.deployButton}
          >
            Load Team
          </button>
        </div>
      </div>
    </div>
  );
}

/** Two-step (cluster → team) accessible dialog for loading a previously
 * saved team onto the canvas. Calling `onLoadTeam` is the parent's cue to
 * populate the canvas and set the active team/cluster ids — this modal
 * itself makes no changes to canvas state. */
export function DeploySavedTeamModal({ isOpen, ...rest }: DeploySavedTeamModalProps) {
  if (!isOpen) return null;
  return <DeploySavedTeamModalContent {...rest} />;
}

export default DeploySavedTeamModal;
