/**
 * PRD-compliant block stream types.
 *
 * Mirrors the backend's `agent_frame` v2 SSE envelope and the
 * semantically-typed block payloads that the LLM never sees as raw
 * markdown — the UI always renders deterministic, schema-validated
 * structures.
 */

/** Lifecycle phase of the agent frame. */
export type Phase =
  | "planning"
  | "executing"
  | "verification"
  | "interruption_awaited"
  | "completed"
  | "failed"
  /** Pre-frame placeholder before the server emits the first agent_frame. */
  | "idle";

/** Status of a single todo item. */
export type TodoStatus = "pending" | "running" | "completed" | "failed";

/** Status of an individual block within the stream. */
export type BlockStatus = "pending" | "streaming" | "complete" | "failed" | "locked";

/** A single todo entry, surfaced in the agent_frame `todo_list`. */
export interface TodoItem {
  id: string;
  title: string;
  status: TodoStatus;
}

/** Interruption payload from `interruption_awaited` phase. */
export interface InterruptionPayload {
  tool_name: string;
  reason: string;
  arguments: Record<string, unknown>;
}

/* ─── Block kinds ──────────────────────────────────────────────── */

interface BlockBase {
  id: string;
  status: BlockStatus;
  locked: boolean;
  created_at: number;
  /**
   * When set, this block is a child of another block (a sub-agent's
   * forwarded internal step) and is rendered nested inside its parent
   * rather than at the top level of the stream.
   */
  parent_id?: string | null;
}

/** Text block — markdown-lite subset (headings, lists, inline emphasis, code fences). */
export interface TextBlock extends BlockBase {
  kind: "text";
  format: "markdown-lite";
  content: string;
}

/** Structured todo list block — backend manages task statuses natively. */
export interface TodoBlock extends BlockBase {
  kind: "todo";
  items: TodoItem[];
}

/** Structured tabular data block — rows are emitted only when fully formed. */
export interface TableBlock extends BlockBase {
  kind: "table";
  columns: string[];
  rows: string[][];
}

/** Hierarchical list block — nested trees via structured data. */
export interface ListItem {
  text: string;
  children: ListItem[];
}
export interface ListBlock extends BlockBase {
  kind: "list";
  items: ListItem[];
}

/** Reasoning block — chain-of-thought streamed alongside text. */
export interface ReasoningBlock extends BlockBase {
  kind: "reasoning";
  content: string;
}

/** Tool-call block — surfaces tool name, inputs, status, and output. */
export interface ToolBlock extends BlockBase {
  kind: "tool";
  tool_name: string;
  arguments: Record<string, unknown>;
  output?: string;
}

/** Sub-agent execution block — wraps delegated agent output. */
export interface SubAgentBlock extends BlockBase {
  kind: "subagent";
  agent_name: string;
  content?: string;
}

/** Terminal error block — token-healed by the backend interceptor. */
export interface ErrorBlock extends BlockBase {
  kind: "error";
  message: string;
}

export type Block =
  | TextBlock
  | TodoBlock
  | TableBlock
  | ListBlock
  | ReasoningBlock
  | ToolBlock
  | SubAgentBlock
  | ErrorBlock;

/** Internal store shape. */
export interface BlockStoreState {
  session_id: string | null;
  correlation_id: string | null;
  phase: Phase;
  active_block_id: string | null;
  todo_list: TodoItem[];
  interruption: InterruptionPayload | null;
  /** Blocks in arrival order — primary render list. */
  order: string[];
  /** Blocks indexed by ID for O(1) updates. */
  byId: Record<string, Block>;
  /** Wall-clock timestamp of the latest server frame. */
  last_timestamp: number | null;
  /** Monotonic local version, bumped on every flush — used by Object.is short-circuits. */
  version: number;
  /**
   * Map of dropped block IDs -> surviving block ID. Populated when an
   * adjacent duplicate tool block is merged into its predecessor so
   * downstream events targeting the dropped ID still mutate the
   * surviving block instead of being silently dropped.
   */
  aliases: Record<string, string>;
}

/* ─── Server event payloads (v2 protocol) ──────────────────────── */

/** Outer `agent_frame` envelope as emitted by the backend. */
export interface AgentFrameEvent {
  event: "agent_frame";
  data: {
    session_id?: string;
    correlation_id?: string;
    agent_id?: string;
    timestamp?: number;
    phase?: Phase;
    active_block_id?: string | null;
    todo_list?: TodoItem[];
    block_delta?: string | null;
    interruption_payload?: InterruptionPayload | null;
  };
}

/** Block lifecycle events emitted on the same stream. */
export interface BlockCreatedEvent {
  type: "block_created";
  block: Block;
}

export interface BlockUpdatedEvent {
  type: "block_updated";
  block_id: string;
  patch: Partial<Block>;
}

export interface BlockCompleteEvent {
  type: "block_complete";
  block_id: string;
  status?: BlockStatus;
}

/** Discriminated union covering everything the reducer accepts. */
export type AgentFrameInput =
  | AgentFrameEvent
  | BlockCreatedEvent
  | BlockUpdatedEvent
  | BlockCompleteEvent;
