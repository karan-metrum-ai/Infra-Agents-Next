"use client";

import "@xyflow/react/dist/style.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReactFlowProvider, type Node } from "@xyflow/react";
import { Monitor } from "lucide-react";
import type { AgentNodeData } from "./AgentNode.types";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useGetHealthQuery } from "@/features/health/healthApi";
import { setHasDeployedTeams } from "@/features/workflows/workflowCanvasSlice";
import { selectHasDeployedTeams } from "@/features/workflows/workflowCanvasSelectors";
import type { TeamDeployedInfo } from "./ActionButtonsPanel.types";
import { AgentsPanel } from "./AgentsPanel";
import { AgentInspectorPanel } from "./AgentInspectorPanel";
import { ToolCatalogPanel } from "./ToolCatalogPanel";
import { ActionButtonsPanel } from "./ActionButtonsPanel";
import { TeamBuilderPanel } from "./TeamBuilderPanel";
import { RecommendTeamModal } from "./RecommendTeamModal";
import { DeploySavedTeamModal } from "./DeploySavedTeamModal";
import { SaveTeamModal } from "./SaveTeamModal";
import { WorkflowDesignerCanvas } from "./WorkflowDesignerCanvas";
import { useWorkflowCanvas } from "./useWorkflowCanvas";
import { useWorkflowTeamLoader } from "./useWorkflowTeamLoader";
import { useAgentInspectorSelection } from "./useAgentInspectorSelection";
import styles from "./WorkflowDesigner.module.css";

/**
 * `/workflows` — visual team-build -> save -> deploy -> evaluate flow.
 *
 * Decomposed from the Vite source's 3043-LOC `WorkflowDesigner.tsx` into
 * this orchestrator (JSX composition + modal-open state machine only) plus:
 * - `useWorkflowCanvas` — `@xyflow/react` node/edge state, guided team
 *   layout, drag-drop, canvas-draft persistence.
 * - `useWorkflowTeamLoader` — save/load/recommend team identity + backend
 *   composition-to-canvas-nodes flows.
 * - `useAgentInspectorSelection` — selected-agent editing state.
 * - `WorkflowDesignerCanvas` — the `<ReactFlow>` tree itself.
 * See each file's doc comment for its `useEffect` elimination rationale.
 *
 * Sandbox/KYAI adaptation: the Vite source opened `SandboxConfigModal`
 * (Phase 9) and `KyaiPlaygroundModal` (Phase 12) as in-page modals. Neither
 * phase is built yet, so — rather than pull either forward early — this
 * component navigates to the real `/sandbox/new` and `/kyai` routes
 * instead (both already exist per Phase 2; their page bodies are still
 * Phase 9/12 placeholders, which is fine, navigation still works). This
 * matches the same "prefer real navigation over a speculative modal" spirit
 * already documented on `EvaluationModal`'s `layout="page"` mode.
 */
function WorkflowDesignerContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const authReady = useAuthReady();
  const { markStepComplete, markOnboardingComplete } = useOnboardingStatus();
  const hasDeployedTeams = useAppSelector(selectHasDeployedTeams);

  useGetHealthQuery(undefined, { skip: !authReady, pollingInterval: 30000 });

  const canvas = useWorkflowCanvas();
  const teamLoader = useWorkflowTeamLoader({ authReady, syncTeamCanvas: canvas.syncTeamCanvas });
  const inspector = useAgentInspectorSelection({
    setNodes: canvas.setNodes,
    agentSelectedTools: canvas.agentSelectedTools,
    onToolToggle: canvas.handleToolToggle,
    onModelSelect: canvas.handleModelSelect,
    onUserInstructionsChange: canvas.handleUserInstructionsChange,
    currentTeamId: teamLoader.currentTeamId,
  });

  // `teamCanvas.ts` deliberately builds plain, node-type-agnostic `Node[]` so
  // it has no dependency on any one node type's `data` shape. This canvas
  // only ever renders `"agent"`/`"placeholder"` nodes, so every node here
  // genuinely carries `AgentNodeData` (or is filtered out before reaching
  // these props) — this is the one boundary cast that bridges the two.
  const agentNodes = canvas.nodes as Node<AgentNodeData>[];

  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [showDeploySavedTeamModal, setShowDeploySavedTeamModal] = useState(false);
  const [showSaveTeamModal, setShowSaveTeamModal] = useState(false);

  const handleTeamDeployed = (_info: TeamDeployedInfo) => {
    dispatch(setHasDeployedTeams(true));
  };

  const handleTeamCreated = () => {
    markStepComplete("workflows");
    markOnboardingComplete();
  };

  return (
    <div className={styles.workflowDesigner}>
      <WorkflowDesignerCanvas
        wrapperRef={canvas.reactFlowWrapperRef}
        nodes={canvas.nodes}
        edges={canvas.edges}
        onNodesChange={canvas.handleNodesChange}
        onEdgesChange={canvas.onEdgesChange}
        onConnect={canvas.onConnect}
        onDrop={canvas.onDrop}
        onDragOver={canvas.onDragOver}
        onDragLeave={canvas.onDragLeave}
        onSelectionChange={canvas.onSelectionChange}
        onSettingsClick={inspector.handleSettingsClick}
        isRecommending={teamLoader.isRecommending}
      />

      <div className={styles.topBar}>
        <TeamBuilderPanel
          teamName={teamLoader.teamName}
          onTeamNameChange={teamLoader.setTeamName}
          nodeCount={canvas.nodes.length}
          edgeCount={canvas.edges.length}
          selectedClusterId={teamLoader.currentClusterId || teamLoader.selectedClusterId}
          onClearCluster={teamLoader.clearCluster}
        />

        <ActionButtonsPanel
          onRecommendTeam={() => setShowRecommendModal(true)}
          onTestPlayground={() => router.push("/kyai")}
          onSandboxEval={() => router.push("/sandbox/new")}
          onDeploySavedTeam={() => setShowDeploySavedTeamModal(true)}
          onSaveTeam={() => setShowSaveTeamModal(true)}
          currentTeamId={teamLoader.currentTeamId}
          currentClusterId={teamLoader.currentClusterId}
          canExecute={canvas.nodes.length > 0}
          nodes={agentNodes}
          edges={canvas.edges}
          teamName={teamLoader.teamName}
          onTeamCreated={handleTeamCreated}
          onTeamDeployed={handleTeamDeployed}
        />
      </div>

      <AgentsPanel onDragStart={canvas.handleDragStart} onAgentSelect={canvas.addAgentToTeam} />

      {inspector.selectedAgent ? (
        <AgentInspectorPanel
          selectedAgent={inspector.selectedAgent}
          selectedTools={inspector.selectedTools}
          onToolToggle={inspector.handleToolToggle}
          onModelSelect={inspector.handleModelSelect}
          onClose={inspector.closeInspector}
          userInstructions={
            inspector.selectedAgent.nodeId
              ? canvas.agentUserInstructions[inspector.selectedAgent.nodeId] || ""
              : ""
          }
          knowledgeFiles={
            inspector.selectedAgent.nodeId
              ? inspector.agentKnowledgeFiles[inspector.selectedAgent.nodeId] || []
              : []
          }
          cronJobConfig={
            inspector.selectedAgent.nodeId
              ? inspector.agentCronJobConfigs[inspector.selectedAgent.nodeId] ||
                inspector.emptyCronConfig
              : inspector.emptyCronConfig
          }
          onUserInstructionsChange={inspector.handleUserInstructionsChange}
          onFileUpload={inspector.handleFileUpload}
          onFileDelete={inspector.handleFileDelete}
          onCronJobConfigChange={inspector.handleCronJobConfigChange}
          onPanelRef={inspector.setInspectorPanelRef}
        />
      ) : (
        <ToolCatalogPanel />
      )}

      {hasDeployedTeams && (
        <div className={styles.dashboardButtonContainer}>
          <button
            type="button"
            onClick={() => router.push("/dashboard/live/teams")}
            className={styles.dashboardButton}
          >
            <Monitor className={styles.dashboardIcon} aria-hidden="true" />
            <span>Move to Dashboard</span>
          </button>
        </div>
      )}

      <RecommendTeamModal
        isOpen={showRecommendModal}
        onClose={() => setShowRecommendModal(false)}
        onShowRecommendedTeam={(features) => {
          void teamLoader.handleShowRecommendedTeam(features);
        }}
      />

      <DeploySavedTeamModal
        isOpen={showDeploySavedTeamModal}
        onClose={() => setShowDeploySavedTeamModal(false)}
        onLoadTeam={teamLoader.handleLoadSavedTeam}
      />

      <SaveTeamModal
        isOpen={showSaveTeamModal}
        onClose={() => setShowSaveTeamModal(false)}
        onTeamSaved={teamLoader.handleTeamSaved}
        nodes={agentNodes}
        edges={canvas.edges}
        teamName={teamLoader.teamName}
        selectedTools={canvas.agentSelectedTools}
        selectedModelClients={canvas.agentSelectedModelClients}
        recommendedTeamPayload={teamLoader.recommendedTeamPayload}
      />
    </div>
  );
}

/** Self-contained `ReactFlowProvider` boundary so this component can be
 * dropped straight into the route's `page.tsx` with no extra wiring. */
export function WorkflowDesigner() {
  return (
    <ReactFlowProvider>
      <WorkflowDesignerContent />
    </ReactFlowProvider>
  );
}

export default WorkflowDesigner;
