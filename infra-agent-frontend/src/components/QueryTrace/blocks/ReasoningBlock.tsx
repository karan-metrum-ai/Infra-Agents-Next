"use client";

import { memo, useMemo, useState } from "react";
import BlockFrame from "./BlockFrame";
import CollapseToggle from "./CollapseToggle";
import MarkdownRenderer from "../MarkdownRenderer";
import ScrollableReasoning from "./ScrollableReasoning";
import ShimmerText from "./ShimmerText";
import { processTraceContent } from "../traceContentPipeline";
import styles from "./blocks.module.css";
import type { ReasoningBlock as ReasoningBlockType } from "../blockStream/types";

/**
 * Reasoning / chain-of-thought block.
 *
 * Visually distinct from the main text block (dashed border, indigo
 * accent). Starts collapsed by default unless the caller opts in.
 */
interface ReasoningBlockProps {
  block: ReasoningBlockType;
  /** Initial open state for completed blocks (last 3 groups). */
  defaultOpen?: boolean;
}

function ReasoningBlock({ block, defaultOpen = false }: ReasoningBlockProps) {
  const isStreaming = block.status === "streaming" && !block.locked;
  const [expanded, setExpanded] = useState(() => defaultOpen && !isStreaming);

  const processed = useMemo(
    () => processTraceContent(block.content, { context: "reasoning", streaming: isStreaming }),
    [block.content, isStreaming],
  );

  return (
    <BlockFrame
      kind="Reasoning"
      status={block.status}
      locked={block.locked}
      className={styles.reasoningBlock}
      inlineToggle
      headerToggle={
        <CollapseToggle
          expanded={expanded}
          onToggle={() => setExpanded((prev) => !prev)}
          label="reasoning"
        />
      }
    >
      {expanded && (
        <ScrollableReasoning revision={block.content.length}>
          <ShimmerText active={isStreaming}>
            <div
              className={[styles.reasoningBody, isStreaming ? styles.traceBodyShimmer : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <MarkdownRenderer content={processed.markdown} preprocess={false} />
            </div>
          </ShimmerText>
        </ScrollableReasoning>
      )}
    </BlockFrame>
  );
}

export default memo(ReasoningBlock);
