"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useAppDispatch } from "@/hooks/useAppDispatch";
import { useMountEffect } from "@/hooks/useMountEffect";
import { addNotification } from "@/features/notifications/notificationsSlice";
import { setCanvasEdges, setCanvasNodes } from "@/features/workflows/workflowCanvasSlice";
import { preloadAllAvatars } from "@/lib/imagePreloader";
import {
  AGENT_NODE_WIDTH,
  buildTeamCanvas,
  createDefaultOperationsManagerNode as buildDefaultOmNode,
  filterPersistedAgentNodes,
  filterPersistedEdges,
  isOperationsManagerNode,
  isPlaceholderNode,
  isPointInPlaceholder,
  PLACEHOLDER_NODE_ID,
} from "./teamCanvas";
import { getCanvasFromLocalStorage, saveCanvasToLocalStorage } from "./workflowCanvasPersistence";
import type { AgentSelectedModelClient } from "./AgentNode.types";
import type { WorkflowAgentDraft } from "./WorkflowDesigner.types";

export interface SyncTeamCanvasOptions {
  fitView?: boolean;
  isDropTarget?: boolean;
  skipPersist?: boolean;
}

/**
 * Owns the Workflow Designer's `@xyflow/react` canvas state: nodes/edges,
 * the guided team layout (via `teamCanvas.ts`), native HTML5 drag-drop
 * (catalog panel -> placeholder slot), and the canvas-draft `localStorage`
 * persistence + one-way Redux mirror (`workflowCanvasSlice`) a later phase's
 * `AgentTeamView`/`TeamsDashboard` can read.
 *
 * Also owns the per-agent tool-selection/model-selection/instructions maps:
 * they round-trip through the same canvas-draft snapshot as nodes/edges, so
 * keeping them here (rather than splitting them into the Inspector-selection
 * hook) avoids a circular hook dependency and a stale-closure bug where a
 * fresh tool toggle could get overwritten by a snapshot save that still read
 * the pre-toggle map.
 *
 * `useEffect` audit (`.cursor/skills/sans-effect`):
 * - Initial mount load from `localStorage` + avatar preload -> genuine
 *   mount-time external-system sync -> `useMountEffect`.
 * - Canvas-resize -> re-layout -> genuine mount-time `ResizeObserver`
 *   subscription -> `useMountEffect` (the observer itself lives for the
 *   component's lifetime; it re-reads live refs on every callback, so it
 *   never needs to be re-subscribed).
 * - Global Delete/Backspace key handler -> genuine mount-time `document`
 *   listener subscription -> `useMountEffect` (reads the latest
 *   `deleteSelected` via a ref updated every render, so no dependency
 *   re-subscription is needed).
 * - Vite's "recover default team shell if canvas ever becomes empty" effect
 *   (watching `nodes`) is NOT ported: every code path that can change
 *   `nodes` goes through `syncTeamCanvas`, which always rebuilds the full
 *   OM + specialists + placeholder shell via `buildTeamCanvas` — the
 *   invariant is now guaranteed by construction, not by reactively watching
 *   for its violation.
 * - Vite's 300ms-debounced "sync nodes/edges to Redux" effect is NOT
 *   ported: every mutation path already dispatches `setCanvasNodes`/
 *   `setCanvasEdges` directly (in `persistCanvasState`), so the debounce was
 *   pure redundant defensive code once every real mutation path is traced.
 */
export function useWorkflowCanvas() {
  const dispatch = useAppDispatch();
  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [placeholderDropActive, setPlaceholderDropActive] = useState(false);

  const [agentSelectedTools, setAgentSelectedTools] = useState<Record<string, string[]>>({});
  const [agentSelectedModelClients, setAgentSelectedModelClients] = useState<
    Record<string, AgentSelectedModelClient | undefined>
  >({});
  const [agentUserInstructions, setAgentUserInstructions] = useState<Record<string, string>>({});

  const { screenToFlowPosition, fitView } = useReactFlow();

  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null);
  const persistedAgentsRef = useRef<Node[]>([]);
  const nodesRef = useRef<Node[]>(nodes);
  nodesRef.current = nodes;

  const getViewportSize = useCallback(
    () => ({
      width: reactFlowWrapperRef.current?.clientWidth || 1200,
      height: reactFlowWrapperRef.current?.clientHeight || 800,
    }),
    [],
  );

  const createDefaultOperationsManagerNode = useCallback(
    () => buildDefaultOmNode(getViewportSize()),
    [getViewportSize],
  );

  const handlePlaceholderClick = useCallback(() => {
    dispatch(
      addNotification({
        type: "info",
        title: "Add agent",
        message: "Select an agent from the catalog or drag one here.",
      }),
    );
  }, [dispatch]);

  const placeholderHandlersRef = useRef({
    onDragOver: (_event: DragEvent<HTMLDivElement>) => {},
    onDrop: (_event: DragEvent<HTMLDivElement>) => {},
    onDragLeave: (_event: DragEvent<HTMLDivElement>) => {},
  });

  const buildPlaceholderData = useCallback(
    (isDropTarget = false) => ({
      isDropTarget,
      onClick: handlePlaceholderClick,
      onDragOver: (event: DragEvent<HTMLDivElement>) =>
        placeholderHandlersRef.current.onDragOver(event),
      onDrop: (event: DragEvent<HTMLDivElement>) => placeholderHandlersRef.current.onDrop(event),
      onDragLeave: (event: DragEvent<HTMLDivElement>) =>
        placeholderHandlersRef.current.onDragLeave(event),
    }),
    [handlePlaceholderClick],
  );

  const persistCanvasState = useCallback(
    (
      displayNodes: Node[],
      displayEdges: Edge[],
      toolsOverride?: Record<string, string[]>,
      modelsOverride?: Record<string, AgentSelectedModelClient | undefined>,
      instructionsOverride?: Record<string, string>,
    ) => {
      const persistedNodes = filterPersistedAgentNodes(displayNodes);
      const persistedEdges = filterPersistedEdges(displayEdges);

      saveCanvasToLocalStorage(
        persistedNodes,
        persistedEdges,
        toolsOverride ?? agentSelectedTools,
        modelsOverride ?? agentSelectedModelClients,
        instructionsOverride ?? agentUserInstructions,
      );
      dispatch(setCanvasNodes(persistedNodes));
      dispatch(setCanvasEdges(persistedEdges));
    },
    [dispatch, agentSelectedTools, agentSelectedModelClients, agentUserInstructions],
  );

  const syncTeamCanvas = useCallback(
    (agentNodes: Node[], options?: SyncTeamCanvasOptions) => {
      const { nodes: displayNodes, edges: displayEdges } = buildTeamCanvas(
        agentNodes,
        getViewportSize(),
        {
          isDropTarget: options?.isDropTarget ?? false,
          placeholderData: buildPlaceholderData(options?.isDropTarget ?? false),
        },
        createDefaultOperationsManagerNode,
      );

      setNodes(displayNodes);
      setEdges(displayEdges);

      const persistedNodes = filterPersistedAgentNodes(displayNodes);
      const persistedEdges = filterPersistedEdges(displayEdges);
      persistedAgentsRef.current = persistedNodes;

      if (options?.skipPersist) {
        dispatch(setCanvasNodes(persistedNodes));
        dispatch(setCanvasEdges(persistedEdges));
      } else {
        persistCanvasState(displayNodes, displayEdges);
      }

      if (options?.fitView) {
        window.setTimeout(() => {
          try {
            fitView({
              padding: 0.3,
              duration: 600,
              includeHiddenNodes: false,
              minZoom: 0.5,
              maxZoom: 1.2,
            });
          } catch {
            // fitView may fail if the component unmounted mid-timeout.
          }
        }, 300);
      }
    },
    [
      buildPlaceholderData,
      createDefaultOperationsManagerNode,
      dispatch,
      fitView,
      getViewportSize,
      persistCanvasState,
      setEdges,
      setNodes,
    ],
  );

  const hasOperationsManagerOnCanvas = useCallback(
    (nodeList: Node[]) => nodeList.some(isOperationsManagerNode),
    [],
  );

  const rejectAgentAddition = useCallback(
    (message: string) => {
      dispatch(addNotification({ type: "warning", title: "Cannot add agent", message }));
    },
    [dispatch],
  );

  const createAgentNode = useCallback(
    (agent: WorkflowAgentDraft): Node => ({
      id: `${agent.type}-${Date.now()}`,
      type: "agent",
      position: { x: 0, y: 0 },
      data: {
        label: agent.label,
        agentType: agent.type,
        description: agent.description,
        tagline: agent.tagline,
        cost: agent.cost,
        capabilities: agent.capabilities,
        strengths: agent.strengths,
        tools: agent.tools,
        status: "idle",
        agentMeta: {
          type: agent.type,
          label: agent.label,
          tagline: agent.tagline,
          description: agent.description,
          cost: agent.cost,
          capabilities: agent.capabilities,
          strengths: agent.strengths,
          tools: agent.tools,
        },
      },
    }),
    [],
  );

  const addAgentToTeam = useCallback(
    (agent: WorkflowAgentDraft) => {
      if (
        agent.type === "operations-manager" &&
        hasOperationsManagerOnCanvas(filterPersistedAgentNodes(nodesRef.current))
      ) {
        rejectAgentAddition("Operations Manager already exists and cannot be added again.");
        return;
      }

      const newNode = createAgentNode(agent);
      const currentAgents = filterPersistedAgentNodes(nodesRef.current);
      syncTeamCanvas([...currentAgents, newNode], { fitView: true });
      setPlaceholderDropActive(false);
    },
    [createAgentNode, hasOperationsManagerOnCanvas, rejectAgentAddition, syncTeamCanvas],
  );

  const updatePlaceholderHighlight = useCallback(
    (isActive: boolean) => {
      setPlaceholderDropActive(isActive);
      setNodes((current) =>
        current.map((node) =>
          isPlaceholderNode(node) ? { ...node, data: { ...buildPlaceholderData(isActive) } } : node,
        ),
      );
    },
    [buildPlaceholderData, setNodes],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const filtered = changes.filter((change) => {
        if (change.type === "position" || change.type === "dimensions") return false;
        if (change.type === "remove") {
          const node = nodesRef.current.find((item) => item.id === change.id);
          if (node && (isOperationsManagerNode(node) || isPlaceholderNode(node))) return false;
        }
        return true;
      });
      if (filtered.length > 0) onNodesChangeRaw(filtered);
    },
    [onNodesChangeRaw],
  );

  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodeIds(selected.map((node) => node.id));
  }, []);

  const onConnect = useCallback((_connection: Connection) => {
    // Manual edge creation is disabled for guided team composition.
  }, []);

  const deleteSelected = useCallback(() => {
    const deletableIds = selectedNodeIds.filter((nodeId) => {
      const node = nodesRef.current.find((item) => item.id === nodeId);
      if (!node) return false;
      return !isOperationsManagerNode(node) && !isPlaceholderNode(node);
    });
    if (deletableIds.length === 0) return;

    const remainingAgents = filterPersistedAgentNodes(nodesRef.current).filter(
      (node) => !deletableIds.includes(node.id),
    );
    syncTeamCanvas(remainingAgents, { fitView: true });
    setSelectedNodeIds([]);
  }, [selectedNodeIds, syncTeamCanvas]);

  const deleteSelectedRef = useRef(deleteSelected);
  deleteSelectedRef.current = deleteSelected;

  // Genuine mount-time external-system sync: subscribes to a document-level
  // keyboard event once for the component's lifetime. Reads the latest
  // `deleteSelected` via a ref (updated every render above) instead of
  // resubscribing on every dependency change.
  useMountEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      const isInputFocused =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.contentEditable === "true" ||
        Boolean(target?.closest('input, textarea, [contenteditable="true"]'));
      if (isInputFocused) return;
      event.preventDefault();
      deleteSelectedRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  });

  const syncTeamCanvasRef = useRef(syncTeamCanvas);
  syncTeamCanvasRef.current = syncTeamCanvas;
  const canvasInitializedRef = useRef(false);

  // Genuine mount-time external-system sync: restores the canvas draft
  // (and per-agent tool/model/instruction selections) from `localStorage`,
  // and preloads avatar images. Runs exactly once.
  useMountEffect(() => {
    preloadAllAvatars();
    try {
      const savedCanvas = getCanvasFromLocalStorage();
      if (savedCanvas) {
        setAgentSelectedTools(savedCanvas.selectedTools);
        setAgentSelectedModelClients(savedCanvas.selectedModelClients);
        setAgentUserInstructions(savedCanvas.agentUserInstructions);
      }
      const persistedAgents = filterPersistedAgentNodes(savedCanvas?.nodes ?? []);
      syncTeamCanvasRef.current(persistedAgents, {
        fitView: true,
        skipPersist: Boolean(savedCanvas),
      });
    } catch {
      syncTeamCanvasRef.current([createDefaultOperationsManagerNode()], { fitView: true });
    }
    canvasInitializedRef.current = true;
  });

  // Genuine mount-time external-system sync: keeps the guided team layout
  // fitted to the canvas panel across resizes for the component's lifetime.
  useMountEffect(() => {
    const wrapper = reactFlowWrapperRef.current;
    if (!wrapper) return undefined;

    let frameId = 0;
    const observer = new ResizeObserver(() => {
      if (!canvasInitializedRef.current) return;
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        syncTeamCanvasRef.current(persistedAgentsRef.current, {
          skipPersist: true,
          fitView: false,
        });
      });
    });

    observer.observe(wrapper);
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  });

  const isDropOnPlaceholder = useCallback(
    (event: DragEvent<Element>) => {
      const placeholderNode = nodesRef.current.find((node) => node.id === PLACEHOLDER_NODE_ID);
      if (!placeholderNode) return false;

      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const width = placeholderNode.width ?? AGENT_NODE_WIDTH;
      const height = placeholderNode.height ?? placeholderNode.width ?? AGENT_NODE_WIDTH;
      return isPointInPlaceholder(flowPosition, placeholderNode.position, width, height);
    },
    [screenToFlowPosition],
  );

  const parseAgentFromDragEvent = useCallback(
    (event: DragEvent<Element>): WorkflowAgentDraft | null => {
      try {
        const payload = JSON.parse(event.dataTransfer.getData("application/json") || "{}") as {
          type?: string;
          agent?: WorkflowAgentDraft;
        };
        if (payload.type === "agent" && payload.agent) return payload.agent;
      } catch {
        // Not a recognized agent drag payload.
      }
      return null;
    },
    [],
  );

  placeholderHandlersRef.current = {
    onDragOver: (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      updatePlaceholderHighlight(true);
    },
    onDrop: (event) => {
      event.preventDefault();
      event.stopPropagation();
      updatePlaceholderHighlight(false);
      const agent = parseAgentFromDragEvent(event);
      if (agent) addAgentToTeam(agent);
    },
    onDragLeave: (event) => {
      event.stopPropagation();
      const relatedTarget = event.relatedTarget as HTMLElement | null;
      if (relatedTarget?.closest("[data-placeholder-node]")) return;
      updatePlaceholderHighlight(false);
    },
  };

  const onDragOver = useCallback(
    (event: DragEvent<Element>) => {
      event.preventDefault();
      const overPlaceholder = isDropOnPlaceholder(event);
      event.dataTransfer.dropEffect = overPlaceholder ? "move" : "none";
      if (overPlaceholder !== placeholderDropActive) updatePlaceholderHighlight(overPlaceholder);
    },
    [isDropOnPlaceholder, placeholderDropActive, updatePlaceholderHighlight],
  );

  const onDragLeave = useCallback(
    (event: DragEvent<Element>) => {
      const relatedTarget = event.relatedTarget as HTMLElement | null;
      if (relatedTarget && reactFlowWrapperRef.current?.contains(relatedTarget)) return;
      updatePlaceholderHighlight(false);
    },
    [updatePlaceholderHighlight],
  );

  const onDrop = useCallback(
    (event: DragEvent<Element>) => {
      event.preventDefault();
      updatePlaceholderHighlight(false);

      const droppedOnPlaceholder = (event.target as HTMLElement | null)?.closest(
        "[data-placeholder-node]",
      );
      if (droppedOnPlaceholder) return;

      if (!isDropOnPlaceholder(event)) {
        rejectAgentAddition("Drop agents on the Add Agent placeholder only.");
        return;
      }

      const agent = parseAgentFromDragEvent(event);
      if (agent) addAgentToTeam(agent);
    },
    [
      addAgentToTeam,
      isDropOnPlaceholder,
      parseAgentFromDragEvent,
      rejectAgentAddition,
      updatePlaceholderHighlight,
    ],
  );

  const handleDragStart = useCallback((event: DragEvent<Element>) => {
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handleToolToggle = useCallback(
    (toolType: string, nodeId: string | undefined, currentSelection: string[]) => {
      if (!nodeId) return currentSelection;
      const next = currentSelection.includes(toolType)
        ? currentSelection.filter((tool) => tool !== toolType)
        : [...currentSelection, toolType];

      const updatedToolsMap = { ...agentSelectedTools, [nodeId]: next };
      setAgentSelectedTools(updatedToolsMap);

      const updatedNodes = nodesRef.current.map((node) =>
        node.id === nodeId && node.type === "agent"
          ? {
              ...node,
              data: {
                ...node.data,
                tools: next,
                agentMeta: node.data.agentMeta
                  ? { ...node.data.agentMeta, tools: next }
                  : node.data.agentMeta,
              },
            }
          : node,
      );
      setNodes(updatedNodes);
      persistCanvasState(updatedNodes, edges, updatedToolsMap);
      return next;
    },
    [agentSelectedTools, edges, persistCanvasState, setNodes],
  );

  const handleModelSelect = useCallback(
    (nodeId: string | undefined, model: AgentSelectedModelClient) => {
      if (!nodeId) return;
      const updatedModelsMap = { ...agentSelectedModelClients, [nodeId]: model };
      setAgentSelectedModelClients(updatedModelsMap);

      const updatedNodes = nodesRef.current.map((node) =>
        node.id === nodeId && node.type === "agent"
          ? { ...node, data: { ...node.data, selectedModelClient: model } }
          : node,
      );
      setNodes(updatedNodes);
      persistCanvasState(updatedNodes, edges, undefined, updatedModelsMap);
    },
    [agentSelectedModelClients, edges, persistCanvasState, setNodes],
  );

  const handleUserInstructionsChange = useCallback(
    (nodeId: string | undefined, instructions: string) => {
      if (!nodeId) return;
      const updatedInstructions = { ...agentUserInstructions, [nodeId]: instructions };
      setAgentUserInstructions(updatedInstructions);

      const updatedNodes = nodesRef.current.map((node) =>
        node.id === nodeId
          ? // eslint-disable-next-line unicorn/no-useless-fallback-in-spread -- `userConfig` is typed `AgentUserConfig | undefined`; TypeScript's strict spread check requires a fallback object even though spreading `undefined` is harmless at runtime.
            {
              ...node,
              data: {
                ...node.data,
                userConfig: { ...(node.data.userConfig ?? {}), userInstructions: instructions },
              },
            }
          : node,
      );
      setNodes(updatedNodes);
      persistCanvasState(updatedNodes, edges, undefined, undefined, updatedInstructions);
    },
    [agentUserInstructions, edges, persistCanvasState, setNodes],
  );

  return {
    nodes,
    edges,
    selectedNodeIds,
    reactFlowWrapperRef,
    getViewportSize,
    createDefaultOperationsManagerNode,
    syncTeamCanvas,
    addAgentToTeam,
    handleNodesChange,
    onEdgesChange,
    onSelectionChange,
    onConnect,
    onDragOver,
    onDragLeave,
    onDrop,
    handleDragStart,
    setNodes,
    agentSelectedTools,
    agentSelectedModelClients,
    agentUserInstructions,
    handleToolToggle,
    handleModelSelect,
    handleUserInstructionsChange,
  };
}

export type UseWorkflowCanvasResult = ReturnType<typeof useWorkflowCanvas>;
