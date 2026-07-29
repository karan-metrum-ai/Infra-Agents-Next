"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Save, X } from "lucide-react";
import { useCreateAdvancedTeamMutation, useGetClusterIdsQuery } from "@/features/teams/teamsApi";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import {
  buildAdvancedTeamPayload,
  normalizeRecommendedTeamPayload,
} from "./buildAdvancedTeamPayload";
import styles from "./SaveTeamModal.module.css";
import type { SaveTeamModalProps } from "./SaveTeamModal.types";

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const withData = error as { data?: { detail?: string; message?: string }; message?: string };
    if (withData.data?.detail) return withData.data.detail;
    if (withData.data?.message) return withData.data.message;
    if (withData.message) return withData.message;
  }
  return "Failed to save team. Please try again.";
}

function SaveTeamModalContent({
  onClose,
  onTeamSaved,
  nodes,
  edges,
  teamName: initialTeamName,
  selectedTools = {},
  selectedModelClients = {},
  recommendedTeamPayload,
}: Omit<SaveTeamModalProps, "isOpen">) {
  const [selectedClusterId, setSelectedClusterId] = useState("");
  const [teamName, setTeamName] = useState(initialTeamName || "New Team");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null);

  const {
    data: clustersData,
    isLoading: isLoadingClusters,
    error: clustersError,
  } = useGetClusterIdsQuery();
  const [createAdvancedTeam] = useCreateAdvancedTeamMutation();
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);

  const agentCount = nodes.filter((n) => n.type === "agent").length;
  const connectionCount = edges.length;

  // Auto-select the first cluster once data loads, unless the user already
  // picked one — derived at render time (Pattern 1) instead of an effect.
  const activeClusterId =
    selectedClusterId ||
    (clustersData?.cluster_ids?.length ? String(clustersData.cluster_ids[0].cluster_id) : "");

  const handleClusterSelect = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    setSaveError(null);
  };

  const handleSaveTeam = async () => {
    if (!activeClusterId) {
      setSaveError("Please select a cluster");
      return;
    }
    if (!teamName.trim()) {
      setSaveError("Please enter a team name");
      return;
    }
    if (agentCount === 0) {
      setSaveError("Please add at least one agent to the canvas");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = recommendedTeamPayload
        ? normalizeRecommendedTeamPayload(
            recommendedTeamPayload,
            teamName.trim(),
            activeClusterId,
            description.trim() || undefined,
          )
        : buildAdvancedTeamPayload(
            nodes,
            teamName.trim(),
            activeClusterId,
            description.trim() || undefined,
            selectedTools,
            selectedModelClients,
          );

      const result = await createAdvancedTeam(payload).unwrap();

      setSaveSuccess(true);
      setSavedTeamId(result.team_id);

      setTimeout(() => {
        onTeamSaved(result.team_id, activeClusterId, teamName.trim());
        onClose();
      }, 1500);
    } catch (error) {
      setSaveError(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const canSave =
    Boolean(activeClusterId) && teamName.trim().length > 0 && agentCount > 0 && !isSaving;

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
        aria-labelledby="save-team-modal-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.modalHeader}>
          <div className={styles.headerText}>
            <h2 id="save-team-modal-title" className={styles.modalTitle}>
              Save Team
            </h2>
            <p className={styles.modalSubtitle}>Configure and save to a cluster</p>
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

        {saveSuccess && (
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a transient save-confirmation banner, which `role="status"` (a live region) models more accurately.
          <div className={styles.successState} role="status">
            <CheckCircle size={40} className={styles.successIcon} aria-hidden="true" />
            <h3 className={styles.successTitle}>Team Saved</h3>
            <p className={styles.successMessage}>
              &ldquo;{teamName}&rdquo; saved to Cluster {activeClusterId}.
            </p>
            {savedTeamId && (
              <p className={styles.successTeamId}>
                <code>{savedTeamId}</code>
              </p>
            )}
          </div>
        )}

        {!saveSuccess && (
          <div className={styles.modalContent}>
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Team Details</span>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="save-team-name">
                  Name
                </label>
                <input
                  id="save-team-name"
                  type="text"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  className={styles.textInput}
                  placeholder="Enter team name..."
                  disabled={isSaving}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel} htmlFor="save-team-description">
                  Description
                  <span className={styles.optionalTag}>Optional</span>
                </label>
                <textarea
                  id="save-team-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className={styles.textArea}
                  placeholder="What does this team do?"
                  rows={2}
                  disabled={isSaving}
                />
              </div>

              <div className={styles.teamSummary}>
                <span className={styles.summaryItem}>
                  <strong>{agentCount}</strong> agent{agentCount !== 1 ? "s" : ""}
                </span>
                <span className={styles.summaryDot} aria-hidden="true" />
                <span className={styles.summaryItem}>
                  <strong>{connectionCount}</strong> connection{connectionCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <div className={styles.sectionHeaderRow}>
                <span className={styles.sectionTitle}>Target Cluster</span>
                {clustersData && (
                  <span className={styles.clusterCount}>{clustersData.total_clusters}</span>
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
              ) : !clustersData?.cluster_ids?.length ? (
                <div className={styles.emptyState}>
                  <p>No clusters available</p>
                </div>
              ) : (
                <div className={styles.clusterGrid} role="radiogroup" aria-label="Target cluster">
                  {clustersData.cluster_ids.map((cluster) => {
                    const isSelected = activeClusterId === String(cluster.cluster_id);
                    return (
                      <button
                        key={cluster.cluster_id}
                        type="button"
                        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom-styled selection card; a native `<input type="radio">` can't be skinned to this card layout without losing the design system's visual language.
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleClusterSelect(String(cluster.cluster_id))}
                        disabled={isSaving}
                        className={`${styles.clusterCard} ${isSelected ? styles.clusterCardSelected : ""}`}
                      >
                        <div className={styles.clusterRadio} aria-hidden="true">
                          {isSelected && <div className={styles.clusterRadioInner} />}
                        </div>
                        <div className={styles.clusterInfo}>
                          <span className={styles.clusterName}>Cluster {cluster.cluster_id}</span>
                          <span className={styles.clusterDeviceCount}>
                            {cluster.device_count} device{cluster.device_count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {saveError && (
              <div className={styles.errorMessage} role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                <span>{saveError}</span>
              </div>
            )}
          </div>
        )}

        {!saveSuccess && (
          <div className={styles.modalFooter}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveTeam}
              disabled={!canSave}
              className={styles.saveButton}
            >
              {isSaving ? (
                <>
                  <span className={styles.buttonSpinner} aria-hidden="true" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} aria-hidden="true" />
                  Save Team
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Full-featured save dialog: cluster selection, name/description, and
 * `POST /teams/advanced` submission. Accessible dialog (focus trap, Escape,
 * `aria-modal`) via `useDialogFocusTrap`; remounts fresh every time it
 * opens (the outer wrapper only renders it while `isOpen`), so all
 * "reset on open" state is just the component's initial `useState` — no
 * effect needed (see `.cursor/skills/sans-effect` Pattern 5). */
export function SaveTeamModal({ isOpen, ...rest }: SaveTeamModalProps) {
  if (!isOpen) return null;
  return <SaveTeamModalContent {...rest} />;
}

export default SaveTeamModal;
