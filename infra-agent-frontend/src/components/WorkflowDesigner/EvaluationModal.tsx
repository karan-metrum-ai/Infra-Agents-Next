"use client";

import { useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { useGetTeamsQuery } from "@/features/teams/teamsApi";
import { useGetKyaiEvaluationQuery, useGetTrajectoryMermaidQuery } from "@/features/kyai/kyaiApi";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { EvaluationModalHeader } from "./EvaluationModalHeader";
import { EvaluationModalTabs } from "./EvaluationModalTabs";
import { EvaluationTeamSelection } from "./EvaluationTeamSelection";
import { EvaluationOverviewTab } from "./EvaluationOverviewTab";
import { EvaluationAgentsTab } from "./EvaluationAgentsTab";
import { EvaluationDiagramTab } from "./EvaluationDiagramTab";
import { EvaluationFullscreenDiagram } from "./EvaluationFullscreenDiagram";
import { useKyaiEvaluationStream } from "./useKyaiEvaluationStream";
import { useMermaidDiagramRenderer } from "./useMermaidDiagramRenderer";
import {
  COMPLETE_PHASE_STATUS,
  INITIAL_PHASE_STATUS,
  PREDEFINED_PROMPTS,
} from "./evaluationModalConstants";
import { extractQueryErrorMessage } from "./evaluationModalFormatters";
import { derivePhaseStatus, transformTrajectoryData } from "./evaluationTrajectoryTransform";
import styles from "./EvaluationModal.module.css";
import type {
  EvaluationModalLayout,
  EvaluationModalProps,
  EvaluationTab,
  TeamOption,
} from "./EvaluationModal.types";

type EvaluationModalContentProps = Omit<EvaluationModalProps, "isOpen"> & {
  layout: EvaluationModalLayout;
};

function EvaluationModalContent({ correlationId, onClose, layout }: EvaluationModalContentProps) {
  const isModal = layout === "modal";
  const { dialogRef, handleKeyDown } = useDialogFocusTrap(onClose);

  // Team + prompt selection state (team-selection screen only).
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamPage, setTeamPage] = useState(0);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [hasStartedEvaluation, setHasStartedEvaluation] = useState(false);

  // Trajectory-view UI state.
  const [activeTab, setActiveTab] = useState<EvaluationTab>("overview");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    data: teamsData,
    isLoading: teamsLoading,
    isError: teamsHaveError,
    refetch: refetchTeams,
  } = useGetTeamsQuery(
    { limit: 50, offset: 0 },
    { skip: Boolean(correlationId), refetchOnMountOrArgChange: true },
  );
  const availableTeams: TeamOption[] = teamsData?.teams ?? [];

  const selectedPredefinedPrompt = PREDEFINED_PROMPTS.find(
    (prompt) => prompt.id === selectedPromptId,
  );
  const finalPrompt = [selectedPredefinedPrompt?.prompt, additionalInstructions.trim() || undefined]
    .filter((part): part is string => Boolean(part))
    .join("\n\nAdditional Instructions:\n");
  const hasValidPrompt = selectedPromptId !== null || additionalInstructions.trim().length > 0;

  // Live SSE evaluation stream (raw `fetch`, not RTK Query — see the hook's
  // doc comment) for the "just started an evaluation" flow.
  const stream = useKyaiEvaluationStream();

  // Previously-run evaluation, when opened by `correlationId` (KYAI session
  // replay) instead of starting a fresh one.
  const byCorrelationId = useGetKyaiEvaluationQuery(correlationId ?? skipToken);

  const rawTrajectory = correlationId ? (byCorrelationId.data ?? null) : stream.rawTrajectory;
  const trajectoryData = useMemo(
    () => (rawTrajectory ? transformTrajectoryData(rawTrajectory) : null),
    [rawTrajectory],
  );

  // Dependent query (RTK Query's `skipToken` pattern, see `kyaiApi.ts`):
  // renders a Mermaid diagram from whichever raw trajectory payload is
  // available, regardless of which flow produced it.
  const { data: mermaidDiagram } = useGetTrajectoryMermaidQuery(rawTrajectory ?? skipToken);

  const isLoading = correlationId ? byCorrelationId.isLoading : stream.isStreaming;
  const errorMessage = correlationId
    ? byCorrelationId.isError
      ? extractQueryErrorMessage(byCorrelationId.error, "Failed to load evaluation data")
      : null
    : stream.streamError;

  const currentPhaseStatus = useMemo(() => {
    if (correlationId) return trajectoryData ? COMPLETE_PHASE_STATUS : INITIAL_PHASE_STATUS;
    return derivePhaseStatus(stream.statusUpdates);
  }, [correlationId, trajectoryData, stream.statusUpdates]);

  const { svgHtml, renderError } = useMermaidDiagramRenderer(
    mermaidDiagram ?? null,
    activeTab === "diagram",
  );

  const inTabView = Boolean(correlationId) || hasStartedEvaluation;
  const sessionId = trajectoryData?.metadata?.session_id;

  const handleStartEvaluation = () => {
    const prompt = finalPrompt.trim();
    if (!selectedTeamId || !hasValidPrompt || !prompt) return;
    setHasStartedEvaluation(true);
    setActiveTab("overview");
    stream.startEvaluation(selectedTeamId, prompt);
  };

  const modalBody = (
    <>
      <EvaluationModalHeader layout={layout} onClose={onClose} sessionId={sessionId} />

      {!inTabView ? (
        <div className={styles.tabContent}>
          <EvaluationTeamSelection
            availableTeams={availableTeams}
            teamsLoading={teamsLoading}
            teamsHaveError={teamsHaveError}
            onRetryTeams={refetchTeams}
            teamPage={teamPage}
            onTeamPageChange={setTeamPage}
            selectedTeamId={selectedTeamId}
            onSelectTeam={setSelectedTeamId}
            selectedPromptId={selectedPromptId}
            onSelectPrompt={setSelectedPromptId}
            additionalInstructions={additionalInstructions}
            onAdditionalInstructionsChange={setAdditionalInstructions}
            finalPrompt={finalPrompt}
            hasValidPrompt={hasValidPrompt}
            onStartEvaluation={handleStartEvaluation}
            isStarting={stream.isStreaming}
            streamError={stream.streamError}
          />
        </div>
      ) : (
        <>
          <EvaluationModalTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div
            className={styles.tabContent}
            role="tabpanel"
            id={`evaluation-tabpanel-${activeTab}`}
            aria-labelledby={`evaluation-tab-${activeTab}`}
          >
            {activeTab === "overview" && (
              <EvaluationOverviewTab
                trajectoryData={trajectoryData}
                error={errorMessage}
                isLoading={isLoading}
                statusUpdates={stream.statusUpdates}
                currentPhaseStatus={currentPhaseStatus}
              />
            )}
            {activeTab === "agents" && (
              <EvaluationAgentsTab trajectoryData={trajectoryData} isLoading={isLoading} />
            )}
            {activeTab === "diagram" && (
              <EvaluationDiagramTab
                mermaidDiagram={mermaidDiagram ?? null}
                svgHtml={svgHtml}
                renderError={renderError}
                isLoading={isLoading}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
              />
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {isModal ? (
        <div className={styles.modalOverlay}>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- this codebase's dialogs are styled divs + `useDialogFocusTrap` (Escape-to-close, Tab-cycling via `onKeyDown`) rather than the native `<dialog>` element, for consistent theming/animation across every modal. */}
          <div
            ref={dialogRef}
            className={styles.modalContainer}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- see the disable comment above; a native <dialog> would need a separate top-layer/backdrop restyle that doesn't fit this codebase's shared modal chrome.
            role="dialog"
            aria-modal="true"
            aria-labelledby="evaluation-modal-title"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
          >
            {modalBody}
          </div>
        </div>
      ) : (
        <div className={styles.pageRoot}>
          <div className={styles.pageContainer}>{modalBody}</div>
        </div>
      )}

      {isFullscreen && mermaidDiagram && (
        <EvaluationFullscreenDiagram svgHtml={svgHtml} onClose={() => setIsFullscreen(false)} />
      )}
    </>
  );
}

/**
 * KYAI Playground trajectory viewer/evaluator. `layout="modal"` (default)
 * renders as an accessible overlay dialog on `/workflows`; `layout="page"`
 * renders the same content inline for the `/kyai` route bridges, with no
 * dialog semantics or overlay chrome.
 *
 * Decomposed from the Vite original's single 1583-LOC file into this
 * orchestrator plus sibling view components (`EvaluationTeamSelection`,
 * `EvaluationOverviewTab`, `EvaluationAgentsTab` + `EvaluationAgentStepCard`,
 * `EvaluationDiagramTab` + `EvaluationFullscreenDiagram`), two dedicated
 * hooks (`useKyaiEvaluationStream` for the SSE stream, `useMermaidDiagramRenderer`
 * for the one sanctioned direct `useEffect` in this feature), and pure
 * helper modules (`evaluationModalConstants`, `evaluationModalFormatters`,
 * `evaluationTrajectoryTransform`) — see `.cursor/skills/sans-effect` for
 * the effectless rationale threaded through all of them.
 *
 * Remounts `EvaluationModalContent` fresh every time `isOpen` becomes true
 * (the wrapper only renders it while open), so all "reset on open" state is
 * just each piece's initial `useState` — no reset effect needed, matching
 * `SaveTeamModal`/`RecommendTeamModal`/`DeploySavedTeamModal`.
 */
export function EvaluationModal({
  isOpen,
  correlationId,
  onClose,
  layout = "modal",
}: EvaluationModalProps) {
  if (!isOpen) return null;
  return <EvaluationModalContent correlationId={correlationId} onClose={onClose} layout={layout} />;
}

export default EvaluationModal;
