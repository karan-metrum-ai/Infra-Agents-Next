"use client";

import { memo, useMemo, useState } from "react";
import BlockFrame from "./BlockFrame";
import CollapseToggle from "./CollapseToggle";
import { normalizeToolName } from "@/utils/normalizeToolName";
import MarkdownRenderer from "../MarkdownRenderer";
import styles from "./blocks.module.css";
import type { ToolBlock as ToolBlockType } from "../blockStream/types";
import { isBlockActive, isBlockDone } from "../blockStream/blockStatus";

/** Tool-call block with optional accordion for args and output. */
interface ToolBlockProps {
  block: ToolBlockType;
  /** Initial open state for completed blocks (last 3 groups). */
  defaultOpen?: boolean;
}

function formatElapsed(block: ToolBlockType): string | null {
  if (isBlockActive(block)) {
    return null;
  }
  const now = Date.now();
  const elapsed = now - block.created_at;
  if (elapsed < 1000) return "<1s";
  return `${(elapsed / 1000).toFixed(1)}s`;
}

function formatArgValue(val: unknown): string {
  if (val === null || val === undefined) return "--";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  return JSON.stringify(val);
}

function StatusIndicator({ block }: { block: ToolBlockType }) {
  if (isBlockActive(block)) {
    return <span className={styles.toolSpinner} aria-label="Running" />;
  }
  if (isBlockDone(block)) {
    return (
      <span className={styles.toolStatusDone} aria-label="Completed">
        done
      </span>
    );
  }
  if (block.status === "failed") {
    return (
      <span className={styles.toolStatusFailed} aria-label="Failed">
        fail
      </span>
    );
  }
  return null;
}

function ToolBlock({ block, defaultOpen = false }: ToolBlockProps) {
  const args = block.arguments ?? {};
  const argEntries = Object.entries(args);
  const hasArgs = argEntries.length > 0;
  const hasOutput = Boolean(block.output);
  const hasBody = hasArgs || hasOutput;
  const elapsed = useMemo(() => formatElapsed(block), [block]);
  const label = useMemo(() => normalizeToolName(block.tool_name), [block.tool_name]);
  const isActive = isBlockActive(block);
  const [expanded, setExpanded] = useState(() => defaultOpen && !isActive);

  return (
    <BlockFrame
      kind="Tool Call"
      status={block.status}
      locked={block.locked}
      accessory={
        <span className={styles.toolAccessory}>
          <StatusIndicator block={block} />
          <span className={styles.toolName} title={block.tool_name}>
            {label}
          </span>
          {elapsed && <span className={styles.toolDuration}>{elapsed}</span>}
        </span>
      }
      headerToggle={
        hasBody ? (
          <CollapseToggle
            expanded={expanded}
            onToggle={() => setExpanded((prev) => !prev)}
            label={label}
          />
        ) : undefined
      }
    >
      {expanded && hasArgs && (
        <div className={styles.toolArgsList}>
          {argEntries.map(([key, val]) => (
            <div key={key} className={styles.toolArgRow}>
              <span className={styles.toolArgKey}>{key}</span>
              <span className={styles.toolArgVal}>{formatArgValue(val)}</span>
            </div>
          ))}
        </div>
      )}
      {expanded && hasOutput && (
        <div
          className={[styles.toolOutput, isActive ? styles.traceBodyShimmer : ""]
            .filter(Boolean)
            .join(" ")}
        >
          <MarkdownRenderer
            content={block.output ?? ""}
            context="tool_output"
            streaming={isActive}
          />
          {isBlockActive(block) && <span className={styles.streamingCursor} aria-hidden="true" />}
        </div>
      )}
    </BlockFrame>
  );
}

export default memo(ToolBlock);
