"use client";

import { memo, useCallback, useMemo, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";
import styles from "./blocks.module.css";
import SubAgentTileCompactMetrics from "./SubAgentTileCompactMetrics";
import {
  getSubAgentTileLabel,
  isSubAgentSummaryContent,
  parseSubAgentSummary,
} from "./subAgentTileUtils";
import type { SubAgentBlock } from "../blockStream/types";
import { toAgentStatus, type AgentStatus } from "../deriveTraceStatus";

/**
 * Expandable grid tile for one parallel sub-agent.
 *
 * Expands to full row width while keeping the same compact height;
 * click again to collapse.
 */
interface SubAgentTileProps {
  block: SubAgentBlock;
  expanded?: boolean;
  onToggle?: (blockId: string) => void;
}

function resolveStatus(block: SubAgentBlock): AgentStatus {
  return toAgentStatus(block.status);
}

function toSnippet(content: string | undefined): string {
  if (!content) return "";
  if (isSubAgentSummaryContent(content)) {
    const summary = parseSubAgentSummary(content);
    if (summary?.status) {
      return `status=${summary.status}`;
    }
  }
  const firstLine = content.split(/[\n\r]/)[0];
  const plain = firstLine
    .replace(/`{1,3}/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain;
}

function StatusBadge({ status, label }: { status: AgentStatus; label: string }) {
  if (status === "in_progress") {
    return (
      <span className={`${styles.agentStatus} ${styles.agentStatusRunning}`}>
        <span className={styles.toolSpinner} aria-hidden="true" />
        {label}
      </span>
    );
  }
  if (status === "failed") {
    return <span className={`${styles.agentStatus} ${styles.agentStatusError}`}>{label}</span>;
  }
  return <span className={`${styles.agentStatus} ${styles.agentStatusDone}`}>{label}</span>;
}

function SubAgentTile({ block, expanded = false, onToggle }: SubAgentTileProps) {
  const displayName = useMemo(() => getSubAgentTileLabel(block), [block]);
  const status = resolveStatus(block);
  const snippet = useMemo(() => {
    const raw = toSnippet(block.content);
    if (raw && raw.toLowerCase() === displayName.toLowerCase()) {
      return "";
    }
    return raw;
  }, [block.content, displayName]);
  const statusLabel = status === "in_progress" ? "Running" : status === "failed" ? "Error" : "Done";

  const handleToggle = useCallback(() => {
    onToggle?.(block.id);
  }, [block.id, onToggle]);

  return (
    <button
      type="button"
      className={[styles.agentTileShell, expanded ? styles.agentTileShellExpanded : ""].join(" ")}
      data-status={status === "in_progress" ? "running" : status}
      data-expanded={expanded ? "true" : "false"}
      style={{ "--tile-accent": "var(--muted)" } as CSSProperties}
      aria-label={`${displayName}: ${statusLabel}`}
      aria-expanded={expanded}
      onClick={handleToggle}
    >
      <div className={[styles.agentTile, expanded ? styles.agentTileExpandedRow : ""].join(" ")}>
        <div className={styles.agentTileLeading}>
          <span className={styles.agentTileName} title={block.agent_name}>
            {displayName}
          </span>
          <div className={styles.agentTileHeaderActions}>
            <StatusBadge status={status} label={statusLabel} />
            <span className={styles.agentTileChevron} aria-hidden="true">
              <ChevronDown size={14} />
            </span>
          </div>
        </div>

        {!expanded && snippet && <span className={styles.agentSnippet}>{snippet}</span>}

        {expanded && (
          <div className={styles.agentTileExpandedMetrics}>
            <SubAgentTileCompactMetrics block={block} />
          </div>
        )}
      </div>
    </button>
  );
}

export default memo(SubAgentTile);
