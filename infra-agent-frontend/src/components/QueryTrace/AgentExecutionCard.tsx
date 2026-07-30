"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  type ParsedAgentTrace,
  formatDuration,
  getAgentDisplayName,
  getAgentColor,
} from "./traceDataParser";
import CopyButton from "./blocks/CopyButton";
import MarkdownRenderer from "./MarkdownRenderer";
import ToolCallsTimeline from "./ToolCallsTimeline";
import ReasoningAccordion from "./ReasoningAccordion";
import blockStyles from "./blocks/blocks.module.css";
import styles from "./AgentExecutionCard.module.css";

interface AgentExecutionCardProps {
  agent: ParsedAgentTrace;
  index: number;
}

/**
 * Card displaying individual agent execution details.
 */
function AgentExecutionCard({ agent, index }: AgentExecutionCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const displayName = getAgentDisplayName(agent.name);
  const agentColor = getAgentColor(agent.name);

  const handleCopy = async () => {
    const textToCopy = agent.agent_response || "";

    if (!textToCopy || textToCopy.trim() === "") {
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently degrade, matches CopyButton
      // conventions used throughout QueryTrace.
    }
  };

  // Parse timestamp as UTC (append 'Z' if not present)
  // Server returns timestamps in UTC without 'Z' suffix, so we append it
  // to force correct timezone interpretation
  const utcTimestamp = agent.created_at.endsWith("Z") ? agent.created_at : `${agent.created_at}Z`;
  const parsedDate = new Date(utcTimestamp);
  const isValidDate = !isNaN(parsedDate.getTime());

  const timeAgo = isValidDate
    ? formatDistanceToNow(parsedDate, { addSuffix: true })
    : "Unknown time";

  // Check if agent is still processing
  const isProcessing = agent.status === "processing" || !agent.completed_at;

  return (
    <div className={styles.agentCard}>
      <div className={styles.timelineConnector}>
        <div className={styles.timelineDot} style={{ backgroundColor: agentColor }} />
        {index !== undefined && <div className={styles.timelineLine} />}
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <div className={styles.agentInfo}>
            <div
              className={styles.agentIcon}
              style={{ backgroundColor: `${agentColor}20`, color: agentColor }}
            >
              <span className="material-symbols-outlined">
                {agent.name.includes("operations_manager") ? "manage_accounts" : "psychology"}
              </span>
            </div>
            <div>
              <div className={styles.agentName}>{displayName}</div>
              <div className={styles.agentTimestamp}>{timeAgo}</div>
            </div>
          </div>
          <div className={styles.cardMeta}>
            <span className={styles.durationChip}>
              {formatDuration(agent.duration_ms || 0, isProcessing)}
            </span>
            <CopyButton
              copied={isCopied}
              onClick={handleCopy}
              title="Copy response"
              aria-label="Copy agent response"
            />
          </div>
        </div>

        {agent.query && (
          <div className={styles.queryReceived}>
            <div className={styles.sectionLabel}>Task Received</div>
            <div className={styles.queryText}>
              <MarkdownRenderer content={agent.query} context="task_goal" />
            </div>
          </div>
        )}

        <ToolCallsTimeline toolCalls={agent.tool_calls || []} />

        <ReasoningAccordion reasoning={agent.reasoning_content} />

        <div className={styles.responseSection}>
          <div className={styles.sectionLabel}>Response</div>
          <div className={blockStyles.responseProse}>
            <MarkdownRenderer content={agent.agent_response} context="agent_response" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentExecutionCard;
