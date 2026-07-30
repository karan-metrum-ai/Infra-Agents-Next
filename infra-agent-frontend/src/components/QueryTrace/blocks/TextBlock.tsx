"use client";

import { memo } from "react";
import BlockFrame from "./BlockFrame";
import MarkdownRenderer from "../MarkdownRenderer";
import { isPlanTransitionMessage } from "../planTransitionMessages";
import styles from "./blocks.module.css";
import type { TextBlock as TextBlockType } from "../blockStream/types";

/** Markdown-lite text block for specialist and orchestrator responses. */
interface TextBlockProps {
  block: TextBlockType;
}

function TextBlock({ block }: TextBlockProps) {
  const isStreaming = block.status === "streaming" && !block.locked;

  if (isPlanTransitionMessage(block.content)) {
    return null;
  }

  return (
    <BlockFrame kind="Response" status={block.status} locked={block.locked} plain>
      <div className={styles.responseProse}>
        <MarkdownRenderer
          content={block.content}
          context="agent_response"
          streaming={isStreaming}
        />
      </div>
    </BlockFrame>
  );
}

export default memo(TextBlock);
