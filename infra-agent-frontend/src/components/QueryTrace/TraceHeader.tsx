"use client";

import { useMemo, useState } from "react";
import { Brain, Copy, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatDuration } from "./traceDataParser";
import { formatDisplayStatus } from "./deriveTraceStatus";
import { formatEscalationQuery } from "@/utils/formatEscalationQuery";
import { useElapsedTick } from "./useElapsedTick";
import MarkdownRenderer from "./MarkdownRenderer";
import styles from "./TraceHeader.module.css";

interface TraceHeaderProps {
  query: string;
  queryId: string;
  timestamp: string;
  status: string;
  totalDuration: number;
  isInProgress?: boolean;
  /** Epoch ms for live elapsed ticker while the flow is running. */
  startTimeMs?: number | null;
  onKyaiClick?: () => void;
  score?: number | null | undefined;
}

/**
 * Header section displaying query metadata.
 *
 * Status labels are humanized via formatDisplayStatus so raw backend
 * strings like "processing" / "in_progress" never appear verbatim.
 */
function TraceHeader({
  query,
  queryId,
  timestamp,
  status,
  totalDuration,
  isInProgress = false,
  startTimeMs = null,
  onKyaiClick,
  score,
}: TraceHeaderProps) {
  const [copied, setCopied] = useState(false);

  useElapsedTick(isInProgress, startTimeMs ?? null);

  const displayDuration =
    isInProgress && startTimeMs != null ? Date.now() - startTimeMs : totalDuration;

  const getStatusColor = () => {
    const display = formatDisplayStatus(status);
    switch (display) {
      case "Completed":
        return styles.statusCompleted;
      case "In Progress":
      case "Processing":
        return styles.statusInProgress;
      case "Failed":
        return styles.statusFailed;
      case "Awaiting Approval":
        return styles.statusAwaiting;
      default:
        return styles.statusUnknown;
    }
  };

  const utcTimestamp = timestamp.endsWith("Z") ? timestamp : `${timestamp}Z`;
  const parsedDate = new Date(utcTimestamp);
  const isValidDate = !isNaN(parsedDate.getTime());

  const timeAgo = isValidDate
    ? formatDistanceToNow(parsedDate, { addSuffix: true })
    : "Unknown time";

  const localTimeString = isValidDate ? parsedDate.toLocaleString() : "Invalid date";

  const hasValidScore = score !== undefined && score !== null && !isNaN(score);

  const handleCopyId = () => {
    navigator.clipboard.writeText(queryId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const displayStatus = formatDisplayStatus(status);
  const formattedQuery = useMemo(() => formatEscalationQuery(query), [query]);

  return (
    <div className={styles.traceHeader}>
      <div className={styles.headerTop}>
        <div className={styles.queryText}>
          <MarkdownRenderer content={formattedQuery} context="query_header" />
        </div>
        <div className={styles.headerMeta}>
          <span className={`${styles.statusBadge} ${getStatusColor()}`}>{displayStatus}</span>
          <span className={styles.durationBadge}>
            {formatDuration(displayDuration, isInProgress)}
          </span>
        </div>
      </div>
      <div className={styles.headerBottom}>
        <div className={styles.queryIdRow}>
          <span className={styles.queryId} title={queryId}>
            {queryId}
          </span>
          <button
            type="button"
            className={styles.queryIdCopyBtn}
            onClick={handleCopyId}
            title="Copy flow ID"
            aria-label="Copy flow ID"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
        <span className={styles.timestamp} title={localTimeString}>
          {timeAgo}
        </span>
      </div>
      {onKyaiClick && hasValidScore && (
        <div className={styles.kyaiButtonContainer}>
          <button
            onClick={onKyaiClick}
            className={styles.kyaiButton}
            title="Open KYAI Playground - Know Your AI"
            type="button"
          >
            <Brain size={18} className={styles.kyaiButtonIcon} />
            <span className={styles.kyaiButtonText}>KYAI</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default TraceHeader;
