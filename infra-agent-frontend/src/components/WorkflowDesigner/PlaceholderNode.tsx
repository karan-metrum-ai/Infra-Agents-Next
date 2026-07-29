"use client";

import { memo, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./PlaceholderNode.module.css";
import type { PlaceholderNodeProps } from "./PlaceholderNode.types";

/**
 * The UI-only "add agent" slot rendered at the end of the team hierarchy
 * (see `teamCanvas.ts`'s `createPlaceholderNode`/`PLACEHOLDER_NODE_ID`).
 * Accepts an agent dropped from the catalog panel (drag-and-drop) or a
 * direct click/keyboard activation (the accessible equivalent — drag-and-drop
 * has no native keyboard path).
 */
function PlaceholderNode({ data }: PlaceholderNodeProps) {
  const handleClick = useCallback(() => {
    data.onClick?.();
  }, [data]);

  return (
    <div
      className={styles.placeholderWrapper}
      data-placeholder-node="true"
      onDragOver={data.onDragOver}
      onDrop={data.onDrop}
      onDragLeave={data.onDragLeave}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className={styles.placeholderHandle}
      />
      <button
        type="button"
        className={cn(styles.placeholderCard, data.isDropTarget && styles.placeholderCardActive)}
        onClick={handleClick}
        aria-label="Add agent to team"
      >
        <span className={styles.placeholderIcon} aria-hidden="true">
          <Plus size={32} strokeWidth={1.5} />
        </span>
        <span className={styles.placeholderLabel}>{data.label || "Add Agent"}</span>
        <span className={styles.placeholderHelper}>Drag agent here on the canvas</span>
      </button>
    </div>
  );
}

export default memo(PlaceholderNode);
