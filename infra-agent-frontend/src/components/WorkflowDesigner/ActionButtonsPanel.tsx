"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { addNotification } from "@/features/notifications/notificationsSlice";
import { useGetHealthQuery } from "@/features/health/healthApi";
import {
  useDeployTeamMutation,
  useLazyGetClusterTeamQuery,
  useGetClusterIdsQuery,
  useStopDeploymentMutation,
} from "@/features/teams/teamsApi";
import { ProfileAvatar } from "@/components/ProfileAvatar/ProfileAvatar";
import floatingPanelStyles from "./FloatingPanel.module.css";
import styles from "./ActionButtonsPanel.module.css";
import type { ActionButtonsPanelProps } from "./ActionButtonsPanel.types";

/** Temporarily disable workflow action buttons on /workflows (matches Vite). */
const WORKFLOW_ACTIONS_UI_DISABLED = true;

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const withData = error as { data?: { detail?: string }; message?: string };
    if (withData.data?.detail) return withData.data.detail;
    if (withData.message) return withData.message;
  }
  return "An unexpected error occurred during deployment.";
}

/**
 * Bottom action bar embedded via `FloatingPanel`'s `className` pass-through
 * (the `actionButtonsFloatingPanel` global class from
 * `FloatingPanel.module.css`) — Recommend / KYAI / Sandbox / Deploy Saved
 * Team / Save / Deploy, plus the inline profile avatar.
 *
 * The Vite original's "Estimate Cost" hover panel is dead UI (fully
 * commented out in source, along with the click-outside effect that only
 * existed to dismiss it) and isn't carried over — see
 * `.cursor/skills/sans-effect`'s guidance against porting confirmed-dead
 * effects. Everything else here is either an RTK Query hook or a plain
 * event handler; no `useEffect` is needed.
 */
export function ActionButtonsPanel({
  onRecommendTeam,
  onTestPlayground,
  onSandboxEval,
  onDeploySavedTeam,
  onSaveTeam,
  onTeamCreated,
  onTeamDeployed,
  currentTeamId,
  currentClusterId,
  isExecuting = false,
  canExecute = true,
  nodes = [],
  edges = [],
  teamName = "",
}: ActionButtonsPanelProps) {
  const [isDeploying, setIsDeploying] = useState(false);
  const dispatch = useAppDispatch();

  useGetHealthQuery(undefined, { pollingInterval: 30000 });
  const [deployTeam] = useDeployTeamMutation();
  const [stopDeployment] = useStopDeploymentMutation();
  const [getClusterTeam] = useLazyGetClusterTeamQuery();
  const { data: clustersData } = useGetClusterIdsQuery();

  const handleDeployTeam = async () => {
    if (!currentTeamId) {
      dispatch(
        addNotification({
          type: "error",
          title: "No Team to Deploy",
          message: "Please save your team first before deploying.",
          duration: 5000,
        }),
      );
      return;
    }

    const clusterId =
      currentClusterId ||
      (clustersData?.cluster_ids?.[0]?.cluster_id
        ? String(clustersData.cluster_ids[0].cluster_id)
        : "1001");

    setIsDeploying(true);

    try {
      dispatch(
        addNotification({
          type: "info",
          title: "Checking Cluster...",
          message: `Checking for existing deployments in Cluster ${clusterId}.`,
          duration: 3000,
        }),
      );

      const clusterTeamResult = await getClusterTeam(clusterId);

      if (
        clusterTeamResult.data?.team_id &&
        clusterTeamResult.data.deployment.is_deployed &&
        clusterTeamResult.data.team_id !== currentTeamId
      ) {
        const existingTeamId = clusterTeamResult.data.team_id;
        const existingTeamName = clusterTeamResult.data.name || "existing team";

        dispatch(
          addNotification({
            type: "info",
            title: "Stopping Existing Deployment",
            message: `Stopping "${existingTeamName}" deployment before deploying new team...`,
            duration: 5000,
          }),
        );

        try {
          await stopDeployment(existingTeamId).unwrap();
          dispatch(
            addNotification({
              type: "success",
              title: "Previous Deployment Stopped",
              message: `Successfully stopped "${existingTeamName}" deployment.`,
              duration: 3000,
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch {
          dispatch(
            addNotification({
              type: "warning",
              title: "Stop Deployment Warning",
              message: "Could not stop existing deployment. Proceeding with new deployment...",
              duration: 4000,
            }),
          );
        }
      }

      dispatch(
        addNotification({
          type: "info",
          title: "Deploying Team...",
          message: `Starting team deployment to Cluster ${clusterId}.`,
          duration: 5000,
        }),
      );

      await deployTeam({ teamId: currentTeamId, clusterId }).unwrap();

      onTeamDeployed?.({
        teamId: currentTeamId,
        teamName: teamName.trim().length > 0 ? teamName : "Saved Team",
        clusterId,
        nodes,
        edges,
      });
      onTeamCreated?.(currentTeamId);

      dispatch(
        addNotification({
          type: "success",
          title: "Team Deployed",
          message: `Team deployment initiated successfully to Cluster ${clusterId}.`,
          duration: 4000,
        }),
      );
    } catch (error) {
      dispatch(
        addNotification({
          type: "error",
          title: "Deployment Failed",
          message: extractErrorMessage(error),
          duration: 8000,
        }),
      );
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSaveTeam = () => {
    if (nodes.length === 0) {
      dispatch(
        addNotification({
          type: "error",
          title: "No Agents on Canvas",
          message: "Please add agents to the canvas before saving.",
          duration: 5000,
        }),
      );
      return;
    }
    onSaveTeam?.();
  };

  return (
    <div className={cn(floatingPanelStyles.floatingPanel, "actionButtonsFloatingPanel")}>
      <div className={floatingPanelStyles.panelContent}>
        <div className={styles.actionButtonsPanel}>
          <button
            type="button"
            onClick={onRecommendTeam}
            disabled={isExecuting}
            className={styles.recommendButton}
          >
            <span className={styles.recommendText}>Recommend Team</span>
          </button>

          <div className={styles.divider} />

          <div className={styles.buttonWithSubcaption}>
            <button
              type="button"
              onClick={onTestPlayground}
              disabled={WORKFLOW_ACTIONS_UI_DISABLED || isExecuting}
              className={cn(styles.actionButton, styles.testButton)}
            >
              <span className={styles.actionText}>K Y A I</span>
            </button>
          </div>

          <div className={styles.buttonWithSubcaption}>
            <button
              type="button"
              onClick={onSandboxEval}
              disabled={WORKFLOW_ACTIONS_UI_DISABLED || isExecuting}
              className={cn(styles.actionButton, styles.sandboxButton)}
            >
              <span className={styles.actionText}>Sandbox</span>
            </button>
          </div>

          <div className={styles.divider} />

          <button
            type="button"
            onClick={onDeploySavedTeam}
            disabled={WORKFLOW_ACTIONS_UI_DISABLED || isExecuting}
            className={cn(styles.actionButton, styles.deploySavedButton)}
          >
            <span className={styles.actionText}>Deploy Saved Team</span>
          </button>

          <div className={styles.divider} />

          <button
            type="button"
            onClick={handleSaveTeam}
            disabled={
              WORKFLOW_ACTIONS_UI_DISABLED || !canExecute || isExecuting || nodes.length === 0
            }
            className={cn(styles.actionButton, styles.saveButton)}
            title="Save team to cluster"
          >
            <span className={styles.actionText}>Save</span>
          </button>

          <button
            type="button"
            onClick={handleDeployTeam}
            disabled={WORKFLOW_ACTIONS_UI_DISABLED || !currentTeamId || isExecuting || isDeploying}
            className={cn(styles.actionButton, styles.saveDeployButton)}
            title={currentTeamId ? "Deploy saved team" : "Save team first to deploy"}
          >
            {isDeploying ? (
              <>
                <span className={styles.buttonSpinner} aria-hidden="true" />
                <span className={styles.actionText}>Deploying...</span>
              </>
            ) : (
              <span className={styles.actionText}>Deploy</span>
            )}
          </button>

          <div className={styles.divider} />

          <ProfileAvatar position="inline" />
        </div>
      </div>
    </div>
  );
}

export default ActionButtonsPanel;
