"use client";

import {
  Background,
  BackgroundVariant,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Edge, Node, NodeProps, OnEdgesChange, OnNodesChange } from "@xyflow/react";
import AgentNode from "@/components/WorkflowDesigner/AgentNode";
import styles from "./AgentTeamView.module.css";
import type { TeamNodeData } from "./AgentTeamView.types";

/** Settings button is a no-op here — this org chart is read-only, matching the Vite source. */
const NOOP = () => {};
const NODE_TYPES = {
  agent: (props: NodeProps<Node<TeamNodeData>>) => <AgentNode {...props} onSettingsClick={NOOP} />,
};

interface AgentTeamGraphCanvasProps {
  nodes: Node<TeamNodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange<Node<TeamNodeData>>;
  onEdgesChange: OnEdgesChange;
}

/**
 * The `<ReactFlow>` tree itself, split out of `AgentTeamView.tsx` so it can
 * be loaded via `next/dynamic({ ssr: false })` (Phase 15) — `@xyflow/react`
 * measures its container via `ResizeObserver` and manages imperative
 * viewport state, neither of which exist during SSR.
 */
export function AgentTeamGraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
}: AgentTeamGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "var(--primary)", strokeWidth: 2 },
        }}
        className={styles.reactFlow}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="color-mix(in oklch, var(--foreground) 20%, transparent)"
        />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

export default AgentTeamGraphCanvas;
