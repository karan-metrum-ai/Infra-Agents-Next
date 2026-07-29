/**
 * Pure reducer that folds `agent_frame` and block lifecycle events into
 * `BlockStoreState`. Returns a new state object when something changed,
 * otherwise returns the same reference so the store can short-circuit.
 *
 * Implements the four PRD streaming rules:
 *   - Rule 1: `block_delta` carries only the new chunk; on
 *     `active_block_id` change the prior block is locked and the
 *     accumulator resets.
 *   - Rule 2: structured blocks (table, list, todo) are mutated only
 *     via explicit `block_created` / `block_updated` payloads — the
 *     reducer never tries to parse text.
 *   - Rule 3: terminal `failed` status is preserved; locked blocks
 *     ignore further updates.
 *   - Rule 4: phase transitions to `interruption_awaited` capture the
 *     interruption payload and freeze further block mutations until
 *     the phase moves out of that state.
 */
import type {
  AgentFrameEvent,
  AgentFrameInput,
  Block,
  BlockCompleteEvent,
  BlockCreatedEvent,
  BlockStoreState,
  BlockUpdatedEvent,
  Phase,
} from "./types";

/**
 * Top-level dispatch entry point. The discriminated union pattern keeps
 * each branch tightly scoped and easy to unit-test.
 */
export function applyAgentFrameInput(
  state: BlockStoreState,
  event: AgentFrameInput,
): BlockStoreState {
  if ("event" in event && event.event === "agent_frame") {
    return applyAgentFrame(state, event);
  }
  if ("type" in event) {
    switch (event.type) {
      case "block_created":
        return applyBlockCreated(state, event);
      case "block_updated":
        return applyBlockUpdated(state, event);
      case "block_complete":
        return applyBlockComplete(state, event);
      default:
        return state;
    }
  }
  return state;
}

/* ─── agent_frame envelope ──────────────────────────────────────── */

function applyAgentFrame(state: BlockStoreState, event: AgentFrameEvent): BlockStoreState {
  const data = event.data ?? {};
  let next = state;

  if (data.session_id && data.session_id !== state.session_id) {
    next = { ...next, session_id: data.session_id };
  }
  if (data.correlation_id && data.correlation_id !== state.correlation_id) {
    next = { ...next, correlation_id: data.correlation_id };
  }
  if (typeof data.timestamp === "number") {
    next = { ...next, last_timestamp: data.timestamp };
  }

  // Phase transition handling (PRD State Transition Matrix).
  if (data.phase && data.phase !== state.phase) {
    next = applyPhaseTransition(next, data.phase);
  }

  // Active block change → lock the previous block. Aliases are
  // resolved here so the orchestrator's ``active_block_id`` pointer
  // lands on the surviving block after an adjacent-duplicate merge.
  if (data.active_block_id !== undefined) {
    const incoming =
      data.active_block_id !== null ? resolveAlias(next, data.active_block_id) : null;
    if (incoming !== state.active_block_id) {
      next = lockBlock(next, state.active_block_id);
      next = { ...next, active_block_id: incoming };
    }
  }

  // todo_list is a full replacement when the server sends it.
  if (Array.isArray(data.todo_list)) {
    next = { ...next, todo_list: data.todo_list.map((item) => ({ ...item })) };
  }

  // Interruption payload (only meaningful in `interruption_awaited` phase).
  if (data.interruption_payload !== undefined) {
    next = {
      ...next,
      interruption: data.interruption_payload ? { ...data.interruption_payload } : null,
    };
  }

  // block_delta: append to the currently-active text/reasoning block.
  if (typeof data.block_delta === "string" && data.block_delta.length > 0) {
    next = appendDelta(next, data.block_delta);
  }

  return next;
}

/**
 * Apply a phase transition. Some transitions have implicit side-effects
 * per the PRD matrix (e.g. `completed` locks every block).
 */
function applyPhaseTransition(state: BlockStoreState, phase: Phase): BlockStoreState {
  if (phase === "completed" || phase === "failed") {
    return {
      ...state,
      phase,
      active_block_id: null,
      order: state.order,
      byId: Object.fromEntries(
        Object.entries(state.byId).map(([id, block]) => [
          id,
          block.locked
            ? block
            : ({
                ...block,
                locked: true,
                status:
                  phase === "failed" && block.status !== "complete"
                    ? "failed"
                    : block.status === "streaming" || block.status === "pending"
                      ? "complete"
                      : block.status,
              } as Block),
        ]),
      ),
      // `completed` forces all todos to 'completed' per the matrix.
      todo_list:
        phase === "completed"
          ? state.todo_list.map((t) => ({
              ...t,
              status: "completed" as const,
            }))
          : state.todo_list,
      interruption: phase === "failed" ? state.interruption : null,
    };
  }
  return { ...state, phase };
}

/* ─── Block lifecycle helpers ───────────────────────────────────── */

/**
 * Map the backend tool-call status vocabulary
 * (``running``/``completed``) onto the store's ``BlockStatus``.
 */
function mapToolStatus(raw: unknown): Block["status"] {
  switch (raw) {
    case "running":
      return "streaming";
    case "completed":
      return "complete";
    case "failed":
      return "failed";
    default:
      return (raw as Block["status"]) ?? "streaming";
  }
}

/**
 * Reconcile incoming wire blocks with the store's canonical kinds.
 *
 * The backend emits ``kind: "tool_call"`` (with ``result_preview`` /
 * ``duration_ms``) while the store models a single ``tool`` kind with
 * an ``output`` field. We accept both shapes so neither protocol
 * version breaks; all other kinds pass through untouched.
 */
function normalizeIncomingBlock(raw: Block): Block {
  const anyBlock = raw as unknown as Record<string, unknown>;
  if (anyBlock && anyBlock.kind === "tool_call") {
    return {
      id: anyBlock.id as string,
      kind: "tool",
      status: mapToolStatus(anyBlock.status),
      locked: Boolean(anyBlock.locked),
      created_at: (anyBlock.created_at as number) ?? Date.now(),
      tool_name: (anyBlock.tool_name as string) ?? "unknown",
      arguments: (anyBlock.arguments as Record<string, unknown>) ?? {},
      output: (anyBlock.result_preview as string) ?? undefined,
    } as Block;
  }
  return raw;
}

/** Translate a tool-call ``fields`` patch onto the ``tool`` block shape. */
function normalizeToolPatch(patch: Partial<Block>): Partial<Block> {
  const p = patch as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  if (p.status !== undefined) out.status = mapToolStatus(p.status);
  if (p.result_preview !== undefined) out.output = p.result_preview;
  if (p.output !== undefined) out.output = p.output;
  if (p.tool_name !== undefined) out.tool_name = p.tool_name;
  if (p.arguments !== undefined) out.arguments = p.arguments;
  return out as Partial<Block>;
}

/**
 * Best-effort agent name inference for orphaned child blocks whose
 * parent SubAgentBlock never arrived. Falls back to ``"agent"`` when
 * the tool name doesn't match a known specialist pattern.
 */
function inferAgentName(child: Block): string {
  if (child.kind === "tool" && child.tool_name) {
    const tn = child.tool_name.toLowerCase();
    if (tn.includes("cooling") || tn.includes("cdu")) {
      return "liquid_cooling_agent";
    }
    if (tn.includes("wlan") || tn.includes("wifi")) {
      return "wlan_network_agent";
    }
    if (tn.includes("servicenow") || tn.includes("incident")) {
      return "level1_support";
    }
    if (tn.includes("hardware") || tn.includes("bmc")) {
      return "hardware_operations";
    }
    if (tn.includes("vastai") || tn.includes("neocloud")) {
      return "vastai_agent";
    }
  }
  return "agent";
}

function applyBlockCreated(state: BlockStoreState, event: BlockCreatedEvent): BlockStoreState {
  const block = normalizeIncomingBlock(event.block);
  if (!block || !block.id) return state;

  // Adjacent-duplicate tool dedup: when a freshly-created tool block
  // would land directly after another tool block with the same
  // ``tool_name`` — under the same parent for nested blocks, or with no
  // intervening top-level block otherwise — the backend has emitted the
  // same logical invocation twice (orchestrator callback + specialist
  // callback, or a retried per-device delegation forwarding the same
  // tool call more than once). Merge the new block's arguments / output
  // / status into the predecessor and record an alias so any later
  // updates targeting the dropped ID still mutate the survivor.
  if (block.kind === "tool") {
    const lastId = block.parent_id
      ? findLastSiblingId(state, block.parent_id)
      : findLastTopLevelId(state);
    const last = lastId ? state.byId[lastId] : undefined;
    if (
      last &&
      last.kind === "tool" &&
      last.tool_name === block.tool_name &&
      last.id !== block.id
    ) {
      const mergedArgs = {
        ...last.arguments,
        ...block.arguments,
      };
      const mergedOutput = block.output ?? last.output;
      const lastIsTerminal = last.status === "complete" || last.status === "failed";
      const mergedStatus = lastIsTerminal ? last.status : (block.status ?? last.status);
      const merged = {
        ...last,
        arguments: mergedArgs,
        output: mergedOutput,
        status: mergedStatus,
      } as Block;
      return {
        ...state,
        byId: { ...state.byId, [last.id]: merged },
        aliases: { ...state.aliases, [block.id]: last.id },
      };
    }
  }

  // Auto-synthesize a placeholder SubAgentBlock when a child block
  // references a parent_id that doesn't exist in the store. This
  // handles the case where the ``agent_delegation`` event was lost
  // (SSE reconnect gap, event ordering race) but the specialist's
  // forwarded tool/reasoning blocks still arrive with parent_id set.
  let next = state;
  if (block.parent_id && !state.byId[block.parent_id]) {
    const placeholder: Block = {
      id: block.parent_id,
      kind: "subagent",
      agent_name: inferAgentName(block),
      status: "streaming",
      locked: false,
      created_at: Date.now(),
      parent_id: null,
    };
    next = {
      ...next,
      order: [...next.order, block.parent_id],
      byId: { ...next.byId, [block.parent_id]: placeholder },
    };
  }

  // When a child block arrives for an existing placeholder parent
  // that still has the generic fallback name, try to upgrade the
  // name from the child's tool_name so the UI header shows the
  // real agent identity instead of "Agent".
  if (
    block.parent_id &&
    next.byId[block.parent_id] &&
    next.byId[block.parent_id].kind === "subagent" &&
    (next.byId[block.parent_id] as { agent_name: string }).agent_name === "agent"
  ) {
    const better = inferAgentName(block);
    if (better !== "agent") {
      const parent = next.byId[block.parent_id];
      next = {
        ...next,
        byId: {
          ...next.byId,
          [block.parent_id]: { ...parent, agent_name: better } as Block,
        },
      };
    }
  }

  const existing = next.byId[block.id];
  if (existing && existing.locked) {
    // Locked blocks are immutable — silently ignore re-creates.
    return next;
  }

  const created: Block = {
    ...block,
    locked: false,
    status: block.status ?? (existing ? existing.status : "streaming"),
    created_at: block.created_at ?? Date.now(),
  };

  return {
    ...next,
    order: existing ? next.order : [...next.order, block.id],
    byId: { ...next.byId, [block.id]: created },
  };
}

/**
 * Find the most recent top-level block ID in ``state.order``.
 *
 * Skips blocks that are nested under another block (``parent_id`` set)
 * since they render inside their parent panel rather than at the top
 * of the trace and are not adjacency candidates for dedup.
 */
function findLastTopLevelId(state: BlockStoreState): string | null {
  for (let i = state.order.length - 1; i >= 0; i--) {
    const id = state.order[i];
    const block = state.byId[id];
    if (block && !block.parent_id) {
      return id;
    }
  }
  return null;
}

/**
 * Find the most recent block ID sharing the given ``parentId`` in
 * ``state.order`` — the nested-block counterpart to
 * ``findLastTopLevelId``, used so adjacent-duplicate dedup also applies
 * to tool calls forwarded under the same (real or placeholder) subagent.
 */
function findLastSiblingId(state: BlockStoreState, parentId: string): string | null {
  for (let i = state.order.length - 1; i >= 0; i--) {
    const id = state.order[i];
    const block = state.byId[id];
    if (block && block.parent_id === parentId) {
      return id;
    }
  }
  return null;
}

/**
 * Resolve a (possibly dropped) block ID to its surviving alias target.
 *
 * Returns the input ID unchanged when no alias is registered.
 */
function resolveAlias(state: BlockStoreState, id: string): string {
  return state.aliases[id] ?? id;
}

function applyBlockUpdated(state: BlockStoreState, event: BlockUpdatedEvent): BlockStoreState {
  const blockId = resolveAlias(state, event.block_id);
  const existing = state.byId[blockId];
  if (!existing) return state;

  // Alias-routed updates land on a locked predecessor whenever the
  // dropped duplicate tool block's late ``block_updated`` arrives.
  // For tool blocks we still want to enrich arguments / output /
  // status (never downgrading a terminal status) so the surviving
  // card shows the merged view from both emissions.
  const isAliasRouted = blockId !== event.block_id;
  if (existing.locked && !(isAliasRouted && existing.kind === "tool")) {
    return state;
  }

  const patch = existing.kind === "tool" ? normalizeToolPatch(event.patch) : event.patch;
  const patched = { ...existing, ...patch } as Block;

  // Preserve a terminal status on the surviving block when an alias
  // update would otherwise overwrite it with ``streaming`` /
  // ``pending`` from the dropped emission.
  if (
    isAliasRouted &&
    existing.kind === "tool" &&
    (existing.status === "complete" || existing.status === "failed")
  ) {
    (patched as { status: Block["status"] }).status = existing.status;
    (patched as { locked: boolean }).locked = existing.locked;
  }

  return {
    ...state,
    byId: { ...state.byId, [blockId]: patched },
  };
}

function applyBlockComplete(state: BlockStoreState, event: BlockCompleteEvent): BlockStoreState {
  const blockId = resolveAlias(state, event.block_id);
  const existing = state.byId[blockId];
  if (!existing) return state;

  // Preserve a terminal failure on lock: a failed tool or an error
  // block must not be downgraded to 'complete' when finalised.
  const terminalStatus =
    existing.status === "failed" || existing.kind === "error" ? "failed" : "complete";

  // Normalise backend status vocabulary (e.g. "completed" → "complete")
  // so hydration snapshots and SSE events use the same canonical values.
  const normalizedStatus = event.status !== undefined ? mapToolStatus(event.status) : undefined;

  const completed: Block = {
    ...existing,
    locked: true,
    status: normalizedStatus ?? terminalStatus,
  };

  return {
    ...state,
    byId: { ...state.byId, [blockId]: completed },
    active_block_id:
      state.active_block_id === blockId || state.active_block_id === event.block_id
        ? null
        : state.active_block_id,
  };
}

/** Lock a block in place when the active block ID moves away from it. */
function lockBlock(state: BlockStoreState, blockId: string | null): BlockStoreState {
  if (!blockId) return state;
  const existing = state.byId[blockId];
  if (!existing) return state;
  if (existing.locked) return state;

  const locked: Block = {
    ...existing,
    locked: true,
    status:
      existing.status === "streaming" || existing.status === "pending"
        ? "complete"
        : existing.status,
  };
  return {
    ...state,
    byId: { ...state.byId, [blockId]: locked },
  };
}

/** Append a text delta to the currently-active text-shaped block. */
function appendDelta(state: BlockStoreState, delta: string): BlockStoreState {
  const activeId = state.active_block_id;
  if (!activeId) return state;

  const existing = state.byId[activeId];
  if (!existing || existing.locked) return state;

  if (existing.kind === "text") {
    const next: Block = {
      ...existing,
      content: existing.content + delta,
      status: "streaming",
    };
    return {
      ...state,
      byId: { ...state.byId, [activeId]: next },
    };
  }

  if (existing.kind === "reasoning") {
    const next: Block = {
      ...existing,
      content: existing.content + delta,
      status: "streaming",
    };
    return {
      ...state,
      byId: { ...state.byId, [activeId]: next },
    };
  }

  if (existing.kind === "tool") {
    const next: Block = {
      ...existing,
      output: (existing.output ?? "") + delta,
      status: "streaming",
    };
    return {
      ...state,
      byId: { ...state.byId, [activeId]: next },
    };
  }

  if (existing.kind === "subagent") {
    const next: Block = {
      ...existing,
      content: (existing.content ?? "") + delta,
      status: "streaming",
    };
    return {
      ...state,
      byId: { ...state.byId, [activeId]: next },
    };
  }

  // Structured blocks (todo, table, list, error) ignore raw text
  // deltas per PRD Rule 2 — they must mutate via block_updated.
  return state;
}
