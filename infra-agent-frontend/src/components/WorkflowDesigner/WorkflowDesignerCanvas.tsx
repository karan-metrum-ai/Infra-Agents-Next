"use client";

import { useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import AgentNode from "./AgentNode";
import PlaceholderNode from "./PlaceholderNode";
import type { AgentNodeData } from "./AgentNode.types";
import styles from "./WorkflowDesignerCanvas.module.css";
import type { WorkflowDesignerCanvasProps } from "./WorkflowDesignerCanvas.types";

/**
 * The `@xyflow/react` canvas tree itself: node/edge rendering, native HTML5
 * drag-drop targets (wired in by `useWorkflowCanvas`), pan/zoom controls,
 * and the "building recommended team" busy overlay. Split out of the main
 * orchestrator purely to keep that file's JSX small — all state and
 * handlers are owned by `useWorkflowCanvas`/`useWorkflowTeamLoader` and
 * passed in as props.
 */
export function WorkflowDesignerCanvas({
  wrapperRef,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onDragLeave,
  onSelectionChange,
  onSettingsClick,
  isRecommending,
}: WorkflowDesignerCanvasProps) {
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      agent: (props: NodeProps<Node<AgentNodeData>>) => (
        <AgentNode {...props} onSettingsClick={onSettingsClick} />
      ),
      placeholder: PlaceholderNode,
    }),
    [onSettingsClick],
  );

  return (
    <div
      className={styles.reactFlowContainer}
      ref={wrapperRef}
      data-testid="workflow-designer-canvas"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesReconnectable={false}
        fitView
        fitViewOptions={{ padding: 0.3, includeHiddenNodes: false, minZoom: 0.5, maxZoom: 1.2 }}
        multiSelectionKeyCode="Shift"
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "var(--border)", strokeWidth: 1 },
        }}
        className={styles.reactFlow}
      >
        <Controls position="bottom-left" className={styles.reactFlowControls} />
        <Background color="color-mix(in oklch, var(--foreground) 20%, transparent)" />
      </ReactFlow>

      {isRecommending && (
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a full-canvas busy overlay, which `role="status"` (a live region) models more accurately.
        <div className={styles.recommendingOverlay} role="status" aria-live="polite">
          <div className={styles.recommendingContent}>
            <span className={styles.recommendingSpinner} aria-hidden="true" />
            Building recommended team...
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowDesignerCanvas;
