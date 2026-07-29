"use client";

import { useCallback, useState } from "react";
import type { Node } from "@xyflow/react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { addNotification } from "@/features/notifications/notificationsSlice";
import {
  useGetClusterIdsQuery,
  useLazyGetRecommendedTeamQuery,
  useLazyGetTeamByIdQuery,
  useListAgentsQuery,
} from "@/features/teams/teamsApi";
import type { RecommendedTeamResponse } from "@/features/teams/teamsApi.types";
import { buildTeamNodesFromComposition } from "./buildTeamNodesFromComposition";
import type { SyncTeamCanvasOptions } from "./useWorkflowCanvas";

export interface UseWorkflowTeamLoaderParams {
  authReady: boolean;
  syncTeamCanvas: (agentNodes: Node[], options?: SyncTeamCanvasOptions) => void;
}

function titleCaseFeature(feature: string): string {
  return feature.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Owns the "load a saved team" and "recommend a team" flows: fetching team
 * composition data (`getTeamById`/`getRecommendedTeam`) and turning it into
 * canvas agent nodes via `buildTeamNodesFromComposition`, plus the team
 * identity fields (`teamName`, cluster/team ids) that the top bar and
 * Save/Deploy actions read.
 *
 * No `useEffect`: both flows are user-triggered (Recommend Team modal
 * confirm, Deploy Saved Team modal confirm) — plain async event handlers,
 * no reactive watching needed.
 */
export function useWorkflowTeamLoader({ authReady, syncTeamCanvas }: UseWorkflowTeamLoaderParams) {
  const dispatch = useAppDispatch();

  const [teamName, setTeamName] = useState("New Team");
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [currentClusterId, setCurrentClusterId] = useState<string | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);
  const [recommendedTeamPayload, setRecommendedTeamPayload] =
    useState<RecommendedTeamResponse | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);

  const { data: agentsResponse } = useListAgentsQuery(
    { is_active: true, is_public: true },
    { skip: !authReady },
  );
  const { data: clustersData } = useGetClusterIdsQuery(undefined, { skip: !authReady });
  const [triggerGetRecommendedTeam] = useLazyGetRecommendedTeamQuery();
  const [triggerGetTeamById] = useLazyGetTeamByIdQuery();

  const handleLoadTeam = useCallback(
    async (teamId: string) => {
      const result = await triggerGetTeamById(teamId);
      const team = result.data;
      if (!team) {
        dispatch(
          addNotification({
            type: "error",
            title: "Failed to Load Team",
            message: "Could not load the selected team. Please try again.",
            duration: 6000,
          }),
        );
        return;
      }

      const agentNodes = buildTeamNodesFromComposition(
        { orchestrator: team.orchestrator, specialists: team.specialists },
        agentsResponse,
      );
      syncTeamCanvas(agentNodes, { fitView: true });
      setTeamName(team.team_name || "Loaded Team");
      setCurrentTeamId(teamId);
    },
    [agentsResponse, dispatch, syncTeamCanvas, triggerGetTeamById],
  );

  const handleLoadSavedTeam = useCallback(
    (teamId: string, clusterId: string) => {
      setSelectedClusterId(clusterId);
      setCurrentClusterId(clusterId);
      void handleLoadTeam(teamId);
    },
    [handleLoadTeam],
  );

  const handleShowRecommendedTeam = useCallback(
    async (selectedFeatures: string[]) => {
      setIsRecommending(true);

      const featureLabels = selectedFeatures.map(titleCaseFeature);
      const generatedName = `Recommended - ${featureLabels.join(", ")}`.slice(0, 50);
      const clusterId =
        selectedClusterId ??
        (clustersData?.cluster_ids?.[0] ? String(clustersData.cluster_ids[0].cluster_id) : "1001");

      const result = await triggerGetRecommendedTeam({ teamName: generatedName, clusterId });

      if (result.error || !result.data) {
        dispatch(
          addNotification({
            type: "error",
            title: "Recommendation Failed",
            message: "Could not build a recommended team. Please try again.",
            duration: 6000,
          }),
        );
        setIsRecommending(false);
        return;
      }

      const payload = result.data;
      setRecommendedTeamPayload(payload);
      setTeamName(payload.name || generatedName);
      if (payload.cluster_id) setSelectedClusterId(payload.cluster_id);
      setCurrentTeamId(null);
      setCurrentClusterId(null);

      const agentNodes = buildTeamNodesFromComposition(payload.team_composition, agentsResponse);
      syncTeamCanvas(agentNodes, { fitView: true });
      setIsRecommending(false);
    },
    [
      agentsResponse,
      clustersData,
      dispatch,
      selectedClusterId,
      syncTeamCanvas,
      triggerGetRecommendedTeam,
    ],
  );

  const handleTeamSaved = useCallback(
    (teamId: string, clusterId: string, savedTeamName: string) => {
      setCurrentTeamId(teamId);
      setCurrentClusterId(clusterId);
      setTeamName(savedTeamName);
      setRecommendedTeamPayload(null);
    },
    [],
  );

  const clearCluster = useCallback(() => {
    setSelectedClusterId(null);
    setCurrentClusterId(null);
  }, []);

  return {
    teamName,
    setTeamName,
    selectedClusterId,
    currentClusterId,
    currentTeamId,
    recommendedTeamPayload,
    isRecommending,
    handleLoadSavedTeam,
    handleShowRecommendedTeam,
    handleTeamSaved,
    clearCluster,
  };
}

export type UseWorkflowTeamLoaderResult = ReturnType<typeof useWorkflowTeamLoader>;
