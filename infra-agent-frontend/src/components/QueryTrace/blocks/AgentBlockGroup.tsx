"use client";

import { memo, type ReactNode } from "react";
import BlockRouter from "./BlockRouter";
import BlockErrorBoundary from "./BlockErrorBoundary";
import BlockActivityStream from "./BlockActivityStream";
import PinnedTodoBar from "./PinnedTodoBar";
import type { AgentGroup } from "../groupBlocksByAgent";
import type {
  Block,
  BlockStoreState,
  SubAgentBlock,
  TextBlock,
  TodoItem,
} from "../blockStream/types";
import { useBlockStream } from "../blockStream/useBlockStream";
import {
  collectBlocksForGroup,
  deriveAgentGroupStatus,
  formatDisplayStatus,
  type AgentStatus,
} from "../deriveTraceStatus";
import { isPlanTransitionMessage } from "../planTransitionMessages";
import { isSubAgentSummaryContent } from "./subAgentTileUtils";
import { isParallelDeviceSubAgent } from "../segmentTimelineGroups";
import styles from "./agentSection.module.css";

/** Label for the orchestrator's answer, kept separate from agent names. */
export const RESPONSE_SECTION_LABEL = "Response";

/** Stable empty-array reference so the `pinnedTodos` default prop never re-creates on render. */
const EMPTY_TODOS: TodoItem[] = [];

/**
 * Flatten subagent wrapper blocks into their nested children so
 * delegated agents render activity blocks directly — matching the
 * Operations Manager layout (ThinkingAccordion, tables, todos).
 *
 * Subagent ``content`` (the specialist's markdown response) is
 * converted into a synthetic ``text`` block so it flows through
 * TextBlock → MarkdownRenderer instead of raw caption text.
 */
export function getRenderableBlocks(group: AgentGroup, snapshot: BlockStoreState): Block[] {
  const all = collectBlocksForGroup(group, snapshot);
  const shellIds = new Set(
    group.blocks
      .filter((block): block is SubAgentBlock => block.kind === "subagent")
      .map((block) => block.id),
  );
  const existingText = new Set(
    all
      .filter((block): block is TextBlock => block.kind === "text")
      .map((block) => block.content.trim()),
  );

  const renderable: Block[] = [];
  const shellSubagents: SubAgentBlock[] = [];

  for (const block of all) {
    if (block.kind !== "subagent") {
      renderable.push(block);
      continue;
    }

    const sub = block as SubAgentBlock;

    if (shellIds.has(sub.id)) {
      shellSubagents.push(sub);
      continue;
    }

    // Device triage tiles render in ParallelAgentCluster — keep the
    // sub-agent shell instead of flattening goal/summary text.
    if (isParallelDeviceSubAgent(sub)) {
      renderable.push(block);
      continue;
    }

    const content = sub.content?.trim();
    if (!content || existingText.has(content) || isSubAgentSummaryContent(content)) {
      continue;
    }

    renderable.push({
      id: `${sub.id}-response`,
      kind: "text",
      format: "markdown-lite",
      content,
      status: sub.status,
      locked: sub.locked,
      created_at: sub.created_at + 1,
    });
    existingText.add(content);
  }

  for (const sub of shellSubagents) {
    const content = sub.content?.trim();
    if (!content || existingText.has(content) || isSubAgentSummaryContent(content)) {
      continue;
    }

    renderable.push({
      id: `${sub.id}-response`,
      kind: "text",
      format: "markdown-lite",
      content,
      status: sub.status,
      locked: sub.locked,
      created_at: sub.created_at + 1,
    });
    existingText.add(content);
  }

  return renderable;
}

interface AgentBlockGroupProps {
  group: AgentGroup;
  depth?: number;
  /** True for the last 3 groups -- keeps reasoning/tool expanded. */
  isRecent?: boolean;
  /** DAG task list pinned to the orchestrator section. */
  pinnedTodos?: TodoItem[];
  /** Shows executing status on the orchestrator header. */
  planExecuting?: boolean;
}

interface AgentNodeProps {
  depth: number;
  /**
   * Agent's section role (manager/level1/specialist/response) — named
   * `agentRole` rather than `role` because oxlint's jsx-a11y plugin
   * flags any prop literally named `role` on JSX elements as an ARIA
   * role attribute, even on non-DOM custom components like this one.
   */
  agentRole: string;
  title?: string;
  agentStatus?: AgentStatus;
  children: ReactNode;
}

function AgentNode({ depth, agentRole, title, agentStatus, children }: AgentNodeProps) {
  return (
    <div
      className={styles.agentNode}
      data-role={agentRole}
      data-status={agentStatus}
      data-depth={depth}
    >
      <div className={styles.agentNodeDot} />
      <div className={styles.agentNodeContent} data-depth={depth}>
        {title && (
          <div className={styles.agentHeader}>
            <span className={styles.agentNodeTitle} data-role={agentRole}>
              {title}
            </span>
            {agentStatus && (
              <span className={styles.statusPill} data-status={agentStatus}>
                {agentStatus === "in_progress" && <span className={styles.pulseDot} />}
                {formatDisplayStatus(agentStatus)}
              </span>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/**
 * Renders a group of v2 blocks inside an agent-segregated section
 * with a connected hierarchy spine, role-colored nodes, and branch
 * connectors.
 *
 * Blocks preserve their original arrival order. Consecutive
 * reasoning / tool / todo blocks collapse into ThinkingAccordion
 * segments; all other kinds (text, table, list, error, subagent)
 * render through BlockRouter so nothing is dropped.
 */
function AgentBlockGroup({
  group,
  depth = 0,
  isRecent = false,
  pinnedTodos = EMPTY_TODOS,
}: AgentBlockGroupProps) {
  const snapshot = useBlockStream();
  const agentStatus = deriveAgentGroupStatus(group, snapshot);

  const agentRole =
    group.role === "orchestrator" ? "manager" : group.role === "primary" ? "level1" : "specialist";

  const showPinnedTodos = group.role === "orchestrator" && pinnedTodos.length > 0;

  if (group.role !== "orchestrator") {
    const renderBlocks = getRenderableBlocks(group, snapshot);

    return (
      <AgentNode
        depth={depth}
        agentRole={agentRole}
        title={group.displayName}
        agentStatus={agentStatus}
      >
        <BlockActivityStream
          blocks={renderBlocks}
          defaultOpen={isRecent}
          embeddedSubAgent={false}
          hideTodos={false}
        />
      </AgentNode>
    );
  }

  // Orchestrator: split into activity section + response section
  const nonTextBlocks = group.blocks.filter((b) => b.kind !== "text");
  const textBlocks = group.blocks.filter(
    (b) => b.kind === "text" && !isPlanTransitionMessage((b as TextBlock).content),
  );

  return (
    <>
      {(nonTextBlocks.length > 0 || showPinnedTodos) && (
        <AgentNode
          depth={depth}
          agentRole="manager"
          title={nonTextBlocks.length > 0 ? group.displayName : undefined}
          agentStatus={agentStatus}
        >
          <BlockActivityStream
            blocks={nonTextBlocks}
            defaultOpen={isRecent}
            embeddedSubAgent={false}
            hideTodos={showPinnedTodos}
          />
          {showPinnedTodos && <PinnedTodoBar items={pinnedTodos} />}
        </AgentNode>
      )}

      {textBlocks.length > 0 && (
        <AgentNode depth={depth} agentRole="response" title={RESPONSE_SECTION_LABEL}>
          {textBlocks.map((block) => (
            <BlockErrorBoundary key={block.id} blockId={block.id}>
              <BlockRouter block={block} defaultOpen={isRecent} embeddedSubAgent={false} />
            </BlockErrorBoundary>
          ))}
        </AgentNode>
      )}
    </>
  );
}

export default memo(AgentBlockGroup);
