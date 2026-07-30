"use client";

import { memo, useContext, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import MarkdownRenderer from "../MarkdownRenderer";
import PulseDot from "../skeletons/PulseDot";
import { normalizeToolName } from "@/utils/normalizeToolName";
import { processTraceContent } from "../traceContentPipeline";
import {
  computeThinkingMeta,
  groupActivitySegments,
  type ActivitySegment,
} from "./groupActivitySegments";
import { TraceLivenessContext } from "./traceLivenessContext";
import styles from "./blocks.module.css";
import type { Block, ToolBlock } from "../blockStream/types";
import { isBlockActive, isBlockDone, hasActiveBlocks } from "../blockStream/blockStatus";
import { useBlockStream } from "../blockStream/useBlockStream";

/**
 * Extract a human-readable one-line summary from tool arguments.
 * Returns null when no meaningful summary can be derived — the caller
 * falls back to the output-based summary in that case.
 */
function getToolInputSummary(toolName: string, args: Record<string, unknown>): string | null {
  const name = toolName.toLowerCase();

  if (name === "read_file" || name === "readfile") {
    const path = String(args.path ?? args.file ?? args.filename ?? "");
    if (path) return path.split("/").pop() ?? path;
  }

  if (name === "delegate_to_agent") {
    const agent = String(args.agent ?? args.agent_id ?? args.agent_name ?? "");
    if (agent) return `→ ${agent}`;
  }

  if (name === "build_execution_plan") {
    const dagId = String(args.dag_id ?? args.id ?? "");
    if (dagId) return `DAG: ${dagId.slice(0, 8)}`;
  }

  if (name === "ls") {
    const path = String(args.path ?? args.directory ?? args.dir ?? "");
    if (path) return path;
  }

  if (name === "glob") {
    const pattern = String(args.pattern ?? args.glob ?? args.path ?? "");
    if (pattern) return pattern;
  }

  if (name === "grep") {
    const pattern = String(args.pattern ?? args.search ?? args.query ?? "");
    if (pattern) {
      return pattern.length > 50 ? `${pattern.slice(0, 50)}…` : pattern;
    }
  }

  if (name === "classify_query") {
    const query = String(args.query ?? args.text ?? "");
    if (query) {
      return query.length > 48 ? `${query.slice(0, 48)}…` : query;
    }
  }

  if (name === "verify_plan") {
    const planId = String(args.plan_id ?? args.dag_id ?? "");
    if (planId) return `Plan: ${planId.slice(0, 8)}`;
  }

  for (const val of Object.values(args)) {
    if (typeof val === "string" && val.length > 0 && val.length < 80) {
      return val;
    }
  }

  return null;
}

/**
 * Collapsible activity group that merges consecutive reasoning, tool,
 * and todo blocks into a single "Thinking" accordion.
 *
 * Collapsed header shows plain-language status:
 *   - Streaming: "Thinking…" + pulse + live timer
 *   - Done: "Thought for 3.2s · 2 actions"
 *
 * Expanded body shows a compact step list (not full BlockFrame cards).
 */
interface ThinkingAccordionProps {
  blocks: Block[];
  /** Initial expand state for completed blocks (last 3 groups). */
  defaultOpen?: boolean;
}

function formatDurationMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function ToolRow({
  block,
  expanded,
  onToggle,
}: {
  block: ToolBlock;
  expanded: boolean;
  onToggle: () => void;
}) {
  const label = useMemo(() => normalizeToolName(block.tool_name), [block.tool_name]);

  const summary = useMemo(() => {
    if (isBlockDone(block)) {
      return null;
    }

    const inputSummary = getToolInputSummary(block.tool_name, block.arguments ?? {});
    if (inputSummary) return inputSummary;

    if (!block.output) return label;
    const processed = processTraceContent(block.output, {
      context: "tool_summary",
      streaming: isBlockActive(block),
    });
    return processed.plainSummary ?? label;
  }, [block, label]);

  const isActive = isBlockActive(block);
  const isDone = isBlockDone(block);
  const isFailed = block.status === "failed";

  return (
    <div className={styles.thinkingToolRow} data-status={block.status}>
      <button
        type="button"
        className={styles.thinkingToolToggle}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={styles.thinkingToolStatus}>
          {isActive && <span className={styles.thinkingToolSpinner} aria-hidden="true" />}
          {isDone && !isFailed && (
            <span className={styles.thinkingToolDone} aria-label="Completed">
              ✓
            </span>
          )}
          {isFailed && (
            <span className={styles.thinkingToolFail} aria-label="Failed">
              !
            </span>
          )}
        </span>
        <span className={styles.thinkingToolLabel}>{label}</span>
        {summary && <span className={styles.thinkingToolSummary}>{summary}</span>}
        <span className={styles.thinkingToolChevron} data-expanded={expanded ? "true" : "false"}>
          <ChevronDown size={12} />
        </span>
      </button>
      {expanded && block.output && (
        <div className={styles.thinkingToolBody}>
          <MarkdownRenderer content={block.output} context="tool_output" streaming={isActive} />
        </div>
      )}
    </div>
  );
}

function ReasoningRow({ block }: { block: Block }) {
  const processed = useMemo(() => {
    if (block.kind !== "reasoning") return null;
    return processTraceContent(block.content, {
      context: "reasoning",
      streaming: isBlockActive(block),
    });
  }, [block]);

  if (!processed || block.kind !== "reasoning") return null;

  return (
    <div className={styles.thinkingReasoningRow}>
      <div className={styles.thinkingReasoningBody}>
        <MarkdownRenderer content={processed.markdown} preprocess={false} />
      </div>
    </div>
  );
}

function ThinkingAccordion({ blocks, defaultOpen = false }: ThinkingAccordionProps) {
  const snapshot = useBlockStream();
  const segments = useMemo(() => groupActivitySegments(blocks), [blocks]);
  const thinkingSegments = useMemo(
    () =>
      segments.filter(
        (s): s is Extract<ActivitySegment, { kind: "thinking" }> => s.kind === "thinking",
      ),
    [segments],
  );

  const hasStreaming = hasActiveBlocks({
    ...snapshot,
    order: blocks.map((b) => b.id),
    byId: Object.fromEntries(blocks.map((b) => [b.id, b])),
  });
  // Running thought groups start collapsed to keep the live panel compact.
  // Completed live groups can still use the caller's defaultOpen hint.
  const isLive = useContext(TraceLivenessContext);
  const [expanded, setExpanded] = useState(() => defaultOpen && isLive && !hasStreaming);

  // Track expanded tool rows individually
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const toggleTool = (id: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (thinkingSegments.length === 0) return null;

  // Merge all thinking blocks into one segment for the accordion
  const allThinkingBlocks = thinkingSegments.flatMap((s) => s.blocks);
  const meta = computeThinkingMeta({
    kind: "thinking",
    blocks: allThinkingBlocks,
    startedAt: thinkingSegments[0]?.startedAt ?? Date.now(),
  });

  const headerLabel = meta.isStreaming
    ? "Thinking…"
    : `Thought for ${formatDurationMs(meta.durationMs)} · ${meta.stepCount} ${meta.stepCount === 1 ? "action" : "actions"}`;

  return (
    <div className={styles.thinkingAccordion}>
      <button
        type="button"
        className={styles.thinkingHeader}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <span className={styles.thinkingHeaderLabel}>
          {meta.isStreaming && <PulseDot ariaLabel="Thinking" size={6} />}
          {headerLabel}
        </span>
        <span className={styles.thinkingHeaderChevron} data-expanded={expanded ? "true" : "false"}>
          <ChevronDown size={14} />
        </span>
      </button>

      {expanded && (
        <div className={styles.thinkingBody}>
          {allThinkingBlocks.map((block) => {
            if (block.kind === "reasoning") {
              return <ReasoningRow key={block.id} block={block} />;
            }
            if (block.kind === "tool") {
              return (
                <ToolRow
                  key={block.id}
                  block={block as ToolBlock}
                  expanded={expandedTools.has(block.id)}
                  onToggle={() => toggleTool(block.id)}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

export default memo(ThinkingAccordion);
