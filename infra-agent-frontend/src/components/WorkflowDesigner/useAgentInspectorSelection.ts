"use client";

import { useCallback, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useMountEffect } from "@/hooks/useMountEffect";
import { addNotification } from "@/features/notifications/notificationsSlice";
import { mapAgentNameForUpload, uploadKnowledgeFile } from "./uploadKnowledgeFile";
import type {
  AgentInspectorKnowledgeFile,
  CronJobConfig,
  KnowledgeFileUploadStatus,
  ModelOption,
} from "./AgentInspectorPanel.types";
import type {
  AgentKnowledgeBankFile,
  AgentNodeData,
  AgentSelectedModelClient,
} from "./AgentNode.types";
import type { SelectedWorkflowAgent, WorkflowAgentNodeData } from "./WorkflowDesigner.types";

const EMPTY_CRON: CronJobConfig = { interval: "", query: "" };

export interface UseAgentInspectorSelectionParams {
  setNodes: (updater: (current: Node[]) => Node[]) => void;
  agentSelectedTools: Record<string, string[]>;
  onToolToggle: (
    toolType: string,
    nodeId: string | undefined,
    currentSelection: string[],
  ) => string[];
  onModelSelect: (nodeId: string | undefined, model: AgentSelectedModelClient) => void;
  onUserInstructionsChange: (nodeId: string | undefined, instructions: string) => void;
  currentTeamId: string | null;
}

/** Mirrors the upload-tracked file list into the node's `userConfig.knowledgeBank`
 * (a differently-shaped array AgentNode only checks the length of, for its
 * "Configured" chip) so that indicator stays accurate without needing the
 * two lists to share an identity scheme. */
function toKnowledgeBankMirror(files: AgentInspectorKnowledgeFile[]): AgentKnowledgeBankFile[] {
  return files.map((file) => ({ type: "other", name: file.name, description: "" }));
}

/**
 * Owns the Agent Inspector side panel's selection + editing state: which
 * agent is open, its in-progress tool selection, knowledge-file uploads, and
 * cron job config. Delegates the actual node-data + canvas-snapshot
 * mutations that need to survive a reload (tools/model/instructions) to the
 * callbacks passed in from `useWorkflowCanvas`, so this hook only owns
 * state that's genuinely ephemeral/session-local (matches the Vite source's
 * actual behavior: knowledge files and cron config were never part of its
 * `saveCanvasToLocalStorage` payload either).
 *
 * The only `useMountEffect`: a permanently-mounted `document` mousedown
 * listener that closes the panel on an outside click. Unlike the Vite
 * original (which added/removed this listener each time `selectedAgent`
 * changed, with a 100ms setTimeout guard against self-closing), this
 * listener mounts once and reads the live "is a panel open" state via a
 * ref updated every render — removing both the resubscription churn and
 * the need for the timing hack (the existing `data-settings-button`
 * exclusion already prevents the settings-button click that opens the
 * panel from also closing it).
 */
export function useAgentInspectorSelection({
  setNodes,
  agentSelectedTools,
  onToolToggle,
  onModelSelect,
  onUserInstructionsChange,
  currentTeamId,
}: UseAgentInspectorSelectionParams) {
  const dispatch = useAppDispatch();

  const [selectedAgent, setSelectedAgent] = useState<SelectedWorkflowAgent | null>(null);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [agentKnowledgeFiles, setAgentKnowledgeFiles] = useState<
    Record<string, AgentInspectorKnowledgeFile[]>
  >({});
  const [agentCronJobConfigs, setAgentCronJobConfigs] = useState<Record<string, CronJobConfig>>({});

  const inspectorElementRef = useRef<HTMLDivElement | null>(null);
  const selectedAgentActiveRef = useRef(false);
  selectedAgentActiveRef.current = Boolean(selectedAgent);

  const setInspectorPanelRef = useCallback((element: HTMLDivElement | null) => {
    inspectorElementRef.current = element;
  }, []);

  const closeInspector = useCallback(() => {
    setSelectedAgent(null);
    setSelectedTools([]);
  }, []);

  useMountEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!selectedAgentActiveRef.current) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (inspectorElementRef.current?.contains(target)) return;
      if (target.closest("[data-settings-button]")) return;
      closeInspector();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  const handleSettingsClick = useCallback(
    (nodeId: string, nodeData: AgentNodeData) => {
      const data = nodeData as WorkflowAgentNodeData;
      const meta = data.agentMeta;
      if (!meta) return;
      const agent: SelectedWorkflowAgent = {
        ...meta,
        nodeId,
        modelClient: data.modelClient,
        tools: data.tools ?? meta.tools ?? [],
      };
      setSelectedAgent(agent);
      setSelectedTools(agentSelectedTools[nodeId] ?? agent.tools ?? []);
    },
    [agentSelectedTools],
  );

  const handleToolToggle = useCallback(
    (toolType: string) => {
      if (!selectedAgent?.nodeId) return;
      const next = onToolToggle(toolType, selectedAgent.nodeId, selectedTools);
      setSelectedTools(next);
      setSelectedAgent((agent) => (agent ? { ...agent, tools: next } : agent));
    },
    [selectedAgent, selectedTools, onToolToggle],
  );

  const handleModelSelect = useCallback(
    (option: ModelOption) => {
      if (!selectedAgent?.nodeId) return;
      onModelSelect(selectedAgent.nodeId, { name: option.name, model: option.model });
    },
    [selectedAgent, onModelSelect],
  );

  const handleUserInstructionsChange = useCallback(
    (instructions: string) => {
      if (!selectedAgent?.nodeId) return;
      onUserInstructionsChange(selectedAgent.nodeId, instructions);
    },
    [selectedAgent, onUserInstructionsChange],
  );

  const handleCronJobConfigChange = useCallback(
    (config: CronJobConfig) => {
      const nodeId = selectedAgent?.nodeId;
      if (!nodeId) return;
      setAgentCronJobConfigs((prev) => ({ ...prev, [nodeId]: config }));
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? // eslint-disable-next-line unicorn/no-useless-fallback-in-spread -- `userConfig` is typed `AgentUserConfig | undefined`; TypeScript's strict spread check requires a fallback object even though spreading `undefined` is harmless at runtime.
              {
                ...node,
                data: {
                  ...node.data,
                  userConfig: { ...(node.data.userConfig ?? {}), cronJobConfig: config },
                },
              }
            : node,
        ),
      );
    },
    [selectedAgent, setNodes],
  );

  const updateFileStatus = useCallback(
    (
      nodeId: string,
      fileId: string,
      status: KnowledgeFileUploadStatus,
      progress?: number,
      errorMessage?: string,
    ) => {
      setAgentKnowledgeFiles((prev) => ({
        ...prev,
        [nodeId]: (prev[nodeId] ?? []).map((file) =>
          file.id === fileId
            ? { ...file, uploadStatus: status, uploadProgress: progress, errorMessage }
            : file,
        ),
      }));
    },
    [],
  );

  const mirrorKnowledgeBank = useCallback(
    (nodeId: string, files: AgentInspectorKnowledgeFile[]) => {
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? // eslint-disable-next-line unicorn/no-useless-fallback-in-spread -- `userConfig` is typed `AgentUserConfig | undefined`; TypeScript's strict spread check requires a fallback object even though spreading `undefined` is harmless at runtime.
              {
                ...node,
                data: {
                  ...node.data,
                  userConfig: {
                    ...(node.data.userConfig ?? {}),
                    knowledgeBank: toKnowledgeBankMirror(files),
                  },
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const handleFileUpload = useCallback(
    async (files: File[]) => {
      const nodeId = selectedAgent?.nodeId;
      if (!nodeId) {
        dispatch(
          addNotification({
            type: "warning",
            title: "No Agent Selected",
            message: "Please select an agent to upload knowledge files.",
            duration: 5000,
          }),
        );
        return;
      }
      const teamId = currentTeamId;
      if (!teamId) {
        dispatch(
          addNotification({
            type: "warning",
            title: "Team Not Saved",
            message:
              'Please save the team first before uploading knowledge files. Click "Save" to save your team.',
            duration: 7000,
          }),
        );
        return;
      }

      const agentName =
        selectedAgent.teamApiConfig?.name ??
        mapAgentNameForUpload(selectedAgent.label ?? "", selectedAgent.type);
      const agentLabel = selectedAgent.label ?? "the selected agent";

      const newFiles: AgentInspectorKnowledgeFile[] = files.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        size: file.size,
        extension: file.name.split(".").pop() ?? "",
        uploadStatus: "pending",
        uploadProgress: 0,
      }));

      const updatedFiles = [...(agentKnowledgeFiles[nodeId] ?? []), ...newFiles];
      setAgentKnowledgeFiles((prev) => ({ ...prev, [nodeId]: updatedFiles }));
      mirrorKnowledgeBank(nodeId, updatedFiles);

      for (const [index, file] of files.entries()) {
        const fileEntry = newFiles[index];
        let ingestionInterval: ReturnType<typeof setInterval> | null = null;
        let ingestionProgress = 50;
        try {
          updateFileStatus(nodeId, fileEntry.id, "uploading", 0);
          await uploadKnowledgeFile(file, teamId, agentName, {
            onUploadProgress: (progress) =>
              updateFileStatus(nodeId, fileEntry.id, "uploading", progress),
            onIngestionStart: () => {
              updateFileStatus(nodeId, fileEntry.id, "ingesting", 50);
              ingestionInterval = setInterval(() => {
                ingestionProgress = Math.min(95, ingestionProgress + 2);
                updateFileStatus(nodeId, fileEntry.id, "ingesting", ingestionProgress);
              }, 500);
            },
          });
          if (ingestionInterval) clearInterval(ingestionInterval);
          updateFileStatus(nodeId, fileEntry.id, "completed", 100);
          dispatch(
            addNotification({
              type: "success",
              title: "Knowledge File Uploaded",
              message: `"${file.name}" has been uploaded and processed successfully for ${agentLabel}.`,
              duration: 4000,
            }),
          );
        } catch (error) {
          if (ingestionInterval) clearInterval(ingestionInterval);
          const message = error instanceof Error ? error.message : "Upload failed";
          updateFileStatus(nodeId, fileEntry.id, "error", 0, message);
          dispatch(
            addNotification({
              type: "error",
              title: "Upload Failed",
              message: `Failed to upload "${file.name}": ${message}`,
              duration: 6000,
            }),
          );
        }
      }
    },
    [
      selectedAgent,
      currentTeamId,
      agentKnowledgeFiles,
      mirrorKnowledgeBank,
      updateFileStatus,
      dispatch,
    ],
  );

  const handleFileDelete = useCallback(
    (fileId: string) => {
      const nodeId = selectedAgent?.nodeId;
      if (!nodeId) return;
      const updatedFiles = (agentKnowledgeFiles[nodeId] ?? []).filter((file) => file.id !== fileId);
      setAgentKnowledgeFiles((prev) => ({ ...prev, [nodeId]: updatedFiles }));
      mirrorKnowledgeBank(nodeId, updatedFiles);
    },
    [selectedAgent, agentKnowledgeFiles, mirrorKnowledgeBank],
  );

  return {
    selectedAgent,
    selectedTools,
    agentKnowledgeFiles,
    agentCronJobConfigs,
    emptyCronConfig: EMPTY_CRON,
    handleSettingsClick,
    handleToolToggle,
    handleModelSelect,
    handleUserInstructionsChange,
    handleCronJobConfigChange,
    handleFileUpload,
    handleFileDelete,
    closeInspector,
    setInspectorPanelRef,
  };
}

export type UseAgentInspectorSelectionResult = ReturnType<typeof useAgentInspectorSelection>;
