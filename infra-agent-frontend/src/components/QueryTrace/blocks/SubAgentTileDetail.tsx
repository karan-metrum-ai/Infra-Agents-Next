"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { useAppSelector } from "@/hooks/useAppSelector";
import { useBlockStream } from "../blockStream/useBlockStream";
import { normalizeToolName } from "@/utils/normalizeToolName";
import { getAgentDisplayName } from "../traceDataParser";
import NestedBlockList from "./NestedBlockList";
import {
  buildDeviceTriageMap,
  isSubAgentSummaryContent,
  lookupDeviceTriage,
  parseSubAgentSummary,
} from "./subAgentTileUtils";
import type { Block, SubAgentBlock } from "../blockStream/types";
import styles from "./blocks.module.css";

interface SubAgentTileDetailProps {
  block: SubAgentBlock;
  /** Render inside an expanded grid tile (no outer chrome). */
  inline?: boolean;
  onClose?: () => void;
}

function formatDurationMs(ms: number | undefined): string | null {
  if (ms == null || ms <= 0) {
    return null;
  }
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Expanded detail panel for a parallel sub-agent tile.
 *
 * Surfaces nested stream blocks (tool calls, reasoning) plus any
 * structured device-triage payload available on the flow snapshot.
 */
function SubAgentTileDetail({ block, inline = false, onClose }: SubAgentTileDetailProps) {
  const snapshot = useBlockStream();
  // See SubAgentTileCompactMetrics.tsx for why this cast is necessary.
  const flowData = useAppSelector((s) => s.flowStream.flowData) as unknown as Record<
    string,
    unknown
  > | null;

  const displayName = useMemo(() => getAgentDisplayName(block.agent_name), [block.agent_name]);

  const children = useMemo<Block[]>(
    () =>
      snapshot.order
        .map((id) => snapshot.byId[id])
        .filter((b): b is Block => Boolean(b) && b.parent_id === block.id),
    [snapshot, block.id],
  );

  const triageMap = useMemo(() => buildDeviceTriageMap(flowData), [flowData]);
  const triage = useMemo(
    () => lookupDeviceTriage(triageMap, block.agent_name),
    [triageMap, block.agent_name],
  );

  const summary = useMemo(() => parseSubAgentSummary(block.content ?? ""), [block.content]);
  const goalText = useMemo(() => {
    const content = block.content?.trim() ?? "";
    if (!content || isSubAgentSummaryContent(content)) {
      return null;
    }
    return content;
  }, [block.content]);

  const status = triage?.status ?? summary?.status;
  const findings = triage?.findings ?? [];
  const toolCalls = triage?.tool_calls ?? [];
  const duration = formatDurationMs(
    triage?.duration_ms ?? (summary?.duration ? Number(summary.duration.replace(/\D/g, "")) : 0),
  );

  return (
    <div
      className={inline ? styles.agentTileDetailInline : styles.agentTileDetail}
      role={inline ? undefined : "region"}
    >
      {!inline && (
        <div className={styles.agentTileDetailHeader}>
          <div>
            <span className={styles.agentTileDetailTitle}>{displayName}</span>
            {triage?.device_category && (
              <span className={styles.agentTileDetailMeta}>{triage.device_category}</span>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              className={styles.agentTileDetailClose}
              onClick={onClose}
              aria-label="Close details"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {inline && triage?.device_category && (
        <span className={styles.agentTileDetailMetaInline}>{triage.device_category}</span>
      )}

      {(status || duration || summary?.findings) && (
        <div className={styles.agentTileDetailMetrics}>
          {status && (
            <div className={styles.agentTileMetric}>
              <span>Status</span>
              <strong data-status={status.toLowerCase()}>{status}</strong>
            </div>
          )}
          {summary?.findings && (
            <div className={styles.agentTileMetric}>
              <span>Findings</span>
              <strong>{summary.findings}</strong>
            </div>
          )}
          {summary?.tools && (
            <div className={styles.agentTileMetric}>
              <span>Tools</span>
              <strong>{summary.tools}</strong>
            </div>
          )}
          {duration && (
            <div className={styles.agentTileMetric}>
              <span>Duration</span>
              <strong>{duration}</strong>
            </div>
          )}
        </div>
      )}

      {goalText && <p className={styles.agentTileDetailGoal}>{goalText}</p>}

      {triage?.error && <div className={styles.agentTileDetailError}>{triage.error}</div>}

      {findings.length > 0 && (
        <div className={styles.agentTileDetailSection}>
          <span className={styles.agentTileDetailLabel}>Findings</span>
          <ul className={styles.agentTileFindings}>
            {findings.map((finding, idx) => (
              <li key={`${idx}-${finding.slice(0, 24)}`}>{finding}</li>
            ))}
          </ul>
        </div>
      )}

      {toolCalls.length > 0 && (
        <div className={styles.agentTileDetailSection}>
          <span className={styles.agentTileDetailLabel}>Tool calls</span>
          <div className={styles.agentTileToolList}>
            {toolCalls.map((tool, idx) => (
              <div key={`${tool.tool_name}-${idx}`} className={styles.agentTileToolRow}>
                <span className={styles.agentTileToolName}>
                  {normalizeToolName(tool.tool_name)}
                </span>
                <span className={styles.agentTileToolStatus}>{tool.status ?? "ok"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className={styles.agentTileDetailSection}>
          <span className={styles.agentTileDetailLabel}>Live trace</span>
          <div className={styles.agentTileDetailStream}>
            <NestedBlockList blocks={children} defaultOpen />
          </div>
        </div>
      )}

      {!triage && !summary && !goalText && children.length === 0 && (
        <p className={styles.agentTileDetailEmpty}>No additional details are available yet.</p>
      )}
    </div>
  );
}

export default SubAgentTileDetail;
