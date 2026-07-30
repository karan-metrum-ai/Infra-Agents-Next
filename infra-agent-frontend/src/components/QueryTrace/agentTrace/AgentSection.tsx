"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { AgentNode } from "./types";
import { formatDuration } from "../traceDataParser";
import CopyButton from "../blocks/CopyButton";
import ReasoningBlock from "./ReasoningBlock";
import ToolBlock from "../blocks/ToolBlock";
import { toolCallToBlockShape } from "../blocks/toolBlockAdapter";
import MarkdownRenderer from "../MarkdownRenderer";
import { RESPONSE_SECTION_LABEL } from "../blocks/AgentBlockGroup";
import blockStyles from "../blocks/blocks.module.css";
import styles from "./AgentTrace.module.css";
import { isPlanTransitionMessage } from "../planTransitionMessages";

type StatusLabel = "working" | "done" | "failed" | "awaiting" | "executing";

interface AgentSectionProps {
  node: AgentNode;
  depth?: number;
  /** True for the last 3 top-level agents -- keeps accordions open. */
  isRecent?: boolean;
  /** Styles the response as an interim plan-review message. */
  showAwaitingApproval?: boolean;
  /** Replaces placeholder copy while approved tasks run. */
  showExecuting?: boolean;
}

function deriveStatusLabel(
  node: AgentNode,
  showAwaitingApproval = false,
  showExecuting = false,
): StatusLabel {
  if (showExecuting) {
    return "executing";
  }
  if (showAwaitingApproval) {
    return "awaiting";
  }
  const s = (node.status || "").toLowerCase();
  if (s === "failed" || s === "error") return "failed";
  if (!node.completedAt || s === "processing" || s === "in_progress" || s === "running") {
    return "working";
  }
  return "done";
}

function shouldRenderResponseText(response: string): boolean {
  const text = response.trim();
  if (!text) {
    return false;
  }
  if (isPlanTransitionMessage(text)) {
    return false;
  }
  return true;
}

/**
 * Recursive agent section with left rail (accent dot + connecting line),
 * header, reasoning, terminal, children, and response.
 */
function AgentSection({
  node,
  depth = 0,
  isRecent = false,
  showAwaitingApproval = false,
  showExecuting = false,
}: AgentSectionProps) {
  const [copied, setCopied] = useState(false);
  const statusLabel = deriveStatusLabel(node, showAwaitingApproval, showExecuting);
  const isStreaming = statusLabel === "working";
  const showResponseText = node.response ? shouldRenderResponseText(node.response) : false;

  const handleCopy = async () => {
    if (!node.response) return;
    try {
      await navigator.clipboard.writeText(node.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently degrade
    }
  };

  let timeAgo = "";
  if (node.createdAt) {
    try {
      const ts = node.createdAt.endsWith("Z") ? node.createdAt : `${node.createdAt}Z`;
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        timeAgo = formatDistanceToNow(d, { addSuffix: true });
      }
    } catch {
      // leave blank
    }
  }

  return (
    <div className={styles.agentSection} data-depth={depth}>
      {/* Left rail */}
      <div className={styles.rail}>
        <div className={styles.railDot} data-role={node.role} />
        <div className={styles.railLine} />
      </div>

      {/* Body */}
      <div className={styles.agentBody}>
        {/* Header */}
        <div className={styles.agentHeader}>
          <span className={styles.agentName}>{node.displayName}</span>
          <span className={styles.statusPill} data-status={statusLabel}>
            {(statusLabel === "working" ||
              statusLabel === "awaiting" ||
              statusLabel === "executing") && <span className={styles.pulseDot} />}
            {statusLabel === "awaiting"
              ? "awaiting approval"
              : statusLabel === "executing"
                ? "executing"
                : statusLabel === "working"
                  ? "running"
                  : statusLabel}
          </span>
          <div className={styles.agentMeta}>
            {timeAgo && <span>{timeAgo}</span>}
            {node.durationMs != null && node.durationMs > 0 && (
              <span>{formatDuration(node.durationMs, isStreaming)}</span>
            )}
          </div>
        </div>

        {/* Task query (optional) */}
        {node.query && <div className={styles.taskLine}>{node.query}</div>}

        {/* Reasoning */}
        <ReasoningBlock
          thoughts={node.reasoning}
          streaming={isStreaming}
          defaultOpen={!isStreaming && isRecent}
        />

        {/* Tool calls — same ToolBlock/BlockFrame styling as the live v2 stream */}
        {node.toolCalls.map((toolCall, index) => (
          <ToolBlock
            key={`${toolCall.tool_name}-${index}`}
            block={toolCallToBlockShape(toolCall, index, isStreaming)}
            defaultOpen={!isStreaming && isRecent}
          />
        ))}

        {/* Sub-agents (recursive) */}
        {node.children.length > 0 && (
          <div className={styles.children}>
            {node.children.map((child) => (
              <AgentSection
                key={child.id}
                node={child}
                depth={depth + 1}
                isRecent={isRecent}
                showExecuting={showExecuting}
              />
            ))}
          </div>
        )}

        {/* Response */}
        {showAwaitingApproval && (
          <div className={styles.responseBlock} data-variant="awaiting-approval">
            <div className={styles.responseAwaitingHint}>
              Review the plan above and approve or reject to continue.
            </div>
          </div>
        )}
        {!showAwaitingApproval && showResponseText && (
          <div className={styles.responseSection}>
            <div className={styles.responseSectionHeader}>
              <span className={styles.responseSectionLabel}>{RESPONSE_SECTION_LABEL}</span>
              <CopyButton
                copied={copied}
                onClick={handleCopy}
                title="Copy response"
                aria-label="Copy agent response"
              />
            </div>
            <div className={`${styles.responseBlock} ${blockStyles.responseProse}`}>
              <MarkdownRenderer content={node.response} context="agent_response" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentSection;
