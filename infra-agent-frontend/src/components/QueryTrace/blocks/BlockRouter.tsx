"use client";

import TextBlock from "./TextBlock";
import TodoBlock from "./TodoBlock";
import TableBlock from "./TableBlock";
import ListBlock from "./ListBlock";
import ReasoningBlock from "./ReasoningBlock";
import ToolBlock from "./ToolBlock";
import SubAgentBlock from "./SubAgentBlock";
import ErrorBlock from "./ErrorBlock";
import type { Block } from "../blockStream/types";

/**
 * Discriminated `switch(block.kind)` router — maps a single typed
 * block onto its dedicated component. The router is intentionally
 * thin: per the PRD, each block kind has a deterministic, native
 * UI representation and the router never branches on content.
 */
interface BlockRouterProps {
  block: Block;
  /** Mount-time open state for collapsible blocks (last 3 groups). */
  defaultOpen?: boolean;
  /** Render sub-agent blocks without duplicate outer chrome. */
  embeddedSubAgent?: boolean;
}

function BlockRouter({ block, defaultOpen = false, embeddedSubAgent = false }: BlockRouterProps) {
  switch (block.kind) {
    case "text":
      return <TextBlock block={block} />;
    case "todo":
      return <TodoBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "list":
      return <ListBlock block={block} />;
    case "reasoning":
      return <ReasoningBlock block={block} defaultOpen={defaultOpen} />;
    case "tool":
      return <ToolBlock block={block} defaultOpen={defaultOpen} />;
    case "subagent":
      return <SubAgentBlock block={block} embedded={embeddedSubAgent} defaultOpen={defaultOpen} />;
    case "error":
      return <ErrorBlock block={block} />;
    default: {
      const exhaustiveCheck: never = block;
      return exhaustiveCheck;
    }
  }
}

export default BlockRouter;
