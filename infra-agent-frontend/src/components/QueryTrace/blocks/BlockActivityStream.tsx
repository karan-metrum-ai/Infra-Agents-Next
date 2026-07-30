"use client";

import BlockRouter from "./BlockRouter";
import BlockErrorBoundary from "./BlockErrorBoundary";
import ThinkingAccordion from "./ThinkingAccordion";
import ParallelAgentCluster from "./ParallelAgentCluster";
import { segmentActivityStream } from "./segmentActivityStream";
import type { Block } from "../blockStream/types";

interface BlockActivityStreamProps {
  blocks: Block[];
  /** Initial expand state for completed blocks (last 3 groups). */
  defaultOpen?: boolean;
  /** Passed through to BlockRouter for subagent blocks. */
  embeddedSubAgent?: boolean;
  /** When true, inline todo blocks are hidden (they render in PinnedTodoBar). */
  hideTodos?: boolean;
}

/**
 * Render blocks in original arrival order, collapsing consecutive
 * reasoning / tool / todo into ThinkingAccordion segments, consecutive
 * sub-agents into ParallelAgentCluster, and passing all other kinds
 * through BlockRouter.
 */
function BlockActivityStream({
  blocks,
  defaultOpen = false,
  embeddedSubAgent = false,
  hideTodos = false,
}: BlockActivityStreamProps) {
  const segments = segmentActivityStream(blocks, { hideTodos });
  const nodes = segments.map((segment, idx) => {
    if (segment.kind === "thinking") {
      const key = segment.blocks.map((b) => b.id).join("-");
      return (
        <ThinkingAccordion key={`think-${key}`} blocks={segment.blocks} defaultOpen={defaultOpen} />
      );
    }

    if (segment.kind === "subagent_cluster") {
      const key = segment.blocks.map((b) => b.id).join("-");
      return (
        <ParallelAgentCluster key={`parallel-${key}-${idx}`} agents={segment.blocks} embedded />
      );
    }

    return (
      <BlockErrorBoundary key={segment.block.id} blockId={segment.block.id}>
        <BlockRouter
          block={segment.block}
          defaultOpen={defaultOpen}
          embeddedSubAgent={segment.block.kind === "subagent" ? embeddedSubAgent : false}
        />
      </BlockErrorBoundary>
    );
  });

  if (nodes.length === 0) return null;

  return <>{nodes}</>;
}

export default BlockActivityStream;
