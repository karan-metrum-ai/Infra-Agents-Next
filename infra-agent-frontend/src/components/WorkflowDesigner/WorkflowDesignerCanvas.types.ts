import type { DragEvent, RefObject } from "react";
import type {
  Edge,
  Node,
  NodeChange,
  OnConnect,
  OnEdgesChange,
  OnSelectionChangeFunc,
} from "@xyflow/react";
import type { AgentNodeData } from "./AgentNode.types";

export interface WorkflowDesignerCanvasProps {
  wrapperRef: RefObject<HTMLDivElement | null>;
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onSelectionChange: OnSelectionChangeFunc;
  onSettingsClick: (nodeId: string, data: AgentNodeData) => void;
  isRecommending: boolean;
}
