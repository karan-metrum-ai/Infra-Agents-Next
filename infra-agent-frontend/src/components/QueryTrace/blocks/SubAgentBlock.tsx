"use client";

import { memo, useMemo, useState } from "react";
import BlockFrame from "./BlockFrame";
import BlockActivityStream from "./BlockActivityStream";
import CollapseToggle from "./CollapseToggle";
import MarkdownRenderer from "../MarkdownRenderer";
import { useBlockStream } from "../blockStream/useBlockStream";
import { getAgentDisplayName } from "../traceDataParser";
import styles from "./blocks.module.css";
import type { Block, SubAgentBlock as SubAgentBlockType } from "../blockStream/types";

/**
 * Sub-agent execution block — wraps a delegated agent's work.
 *
 * When ``embedded`` is true (inside an AgentBlockGroup section) the
 * outer "Sub-agent" card is omitted so the parent agent header reads
 * like Operations Manager. Child blocks (reasoning, tools) tagged with
 * ``parent_id`` render through BlockActivityStream so they group into
 * ThinkingAccordion just like the orchestrator's own activity.
 */
interface SubAgentBlockProps {
  block: SubAgentBlockType;
  /** Skip outer card chrome — used inside AgentBlockGroup sections. */
  embedded?: boolean;
  /** Initial expand state for nested internal details. */
  defaultOpen?: boolean;
}

function SubAgentBlock({ block, embedded = false, defaultOpen = false }: SubAgentBlockProps) {
  const snapshot = useBlockStream();
  const isStreaming = block.status === "streaming" && !block.locked;
  const displayName = useMemo(() => getAgentDisplayName(block.agent_name), [block.agent_name]);
  const children = useMemo<Block[]>(
    () =>
      snapshot.order
        .map((id) => snapshot.byId[id])
        .filter((b): b is Block => Boolean(b) && b.parent_id === block.id),
    [snapshot, block.id],
  );

  const hasBody = Boolean(block.content) || children.length > 0;
  const [expanded, setExpanded] = useState(() => defaultOpen && !isStreaming);

  const childStream = expanded && children.length > 0 && (
    <div className={styles.subagentChildren}>
      <BlockActivityStream
        blocks={children}
        defaultOpen={defaultOpen}
        embeddedSubAgent={false}
        hideTodos={false}
      />
    </div>
  );

  const goalContent = block.content && (
    <MarkdownRenderer content={block.content} context="task_goal" streaming={isStreaming} />
  );

  if (embedded) {
    return (
      <div className={styles.subagentEmbedded}>
        {block.content && (
          <MarkdownRenderer content={block.content} context="task_goal" streaming={isStreaming} />
        )}
        {children.length > 0 && (
          <BlockActivityStream
            blocks={children}
            defaultOpen={defaultOpen}
            embeddedSubAgent={false}
            hideTodos={false}
          />
        )}
      </div>
    );
  }

  return (
    <BlockFrame
      kind="Sub-agent"
      status={block.status}
      locked={block.locked}
      inlineToggle={hasBody}
      headerToggle={
        hasBody ? (
          <CollapseToggle
            expanded={expanded}
            onToggle={() => setExpanded((prev) => !prev)}
            label="sub-agent"
          />
        ) : undefined
      }
      accessory={<span className={styles.subagentChip}>{displayName}</span>}
    >
      {expanded && goalContent}
      {childStream}
    </BlockFrame>
  );
}

export default memo(SubAgentBlock);
