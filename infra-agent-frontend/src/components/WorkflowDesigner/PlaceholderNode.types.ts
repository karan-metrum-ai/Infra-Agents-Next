import type { DragEvent } from "react";

/**
 * The `data` payload for the canvas's UI-only "add agent" placeholder
 * node (`teamCanvas.ts`'s `createPlaceholderNode`). The canvas
 * orchestrator wires the drag/drop and click handlers in; this node
 * itself only renders them.
 */
export interface PlaceholderNodeData extends Record<string, unknown> {
  label: string;
  isDropTarget?: boolean;
  onClick?: () => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (event: DragEvent<HTMLDivElement>) => void;
}

export interface PlaceholderNodeProps {
  data: PlaceholderNodeData;
}
