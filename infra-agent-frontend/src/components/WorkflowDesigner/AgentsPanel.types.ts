import type { ComponentType } from "react";
import type { AgentLabel } from "@/lib/avatars";
import type { AgentMeta } from "./AgentNode.types";

/**
 * A single agent-type catalog entry rendered as a draggable card. Extends
 * the shared `AgentMeta` (already typed for the canvas node's `agentMeta`
 * snapshot — same `description`/`cost`/`capabilities`/`strengths`/`tools`
 * fields this panel populates) rather than redeclaring those fields, and
 * narrows `label` to the known `AgentLabel` union so it round-trips
 * through `getAvatar` cleanly.
 */
export interface AgentCatalogEntry extends AgentMeta {
  type: string;
  label: AgentLabel;
  tagline: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  cost: string;
  capabilities: string[];
  strengths: string[];
}

export interface AgentsPanelProps {
  onDragStart: (
    event: React.DragEvent,
    nodeType: string,
    subtype: string,
    label: string,
    agentData?: AgentCatalogEntry,
  ) => void;
  onAgentSelect?: (agent: AgentCatalogEntry) => void;
  selectedAgent?: AgentCatalogEntry | null;
}
