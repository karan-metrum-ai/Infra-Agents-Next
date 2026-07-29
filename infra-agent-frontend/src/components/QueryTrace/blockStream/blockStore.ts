/**
 * External block-store backing the PRD-compliant agent_frame UI.
 *
 * Owns the per-correlation block state outside of React's render cycle
 * so that high-frequency SSE deltas can be applied without re-running
 * component code on every chunk. Components subscribe via
 * `useSyncExternalStore`, and mutations are batched through a single
 * `requestAnimationFrame` flush per tick.
 *
 * Architecture in three layers:
 *   1. `dispatch(event)` — queues a mutation in a ref-buffer.
 *   2. RAF flush — drains the buffer through the reducer in one go.
 *   3. Notify subscribers — single React render with all changes.
 *
 * This is the same pattern used by Cursor, Linear, and Claude Code's
 * UIs to keep streaming smooth at >60fps without dropping frames.
 */
import { applyAgentFrameInput } from "./agentFrameReducer";
import type { AgentFrameInput, Block, BlockStoreState } from "./types";

/** Listener signature for `subscribe`. */
type Listener = () => void;

/** Per-correlation store instance. */
class BlockStore {
  private state: BlockStoreState;
  private listeners = new Set<Listener>();
  private pending: AgentFrameInput[] = [];
  private flushHandle: number | null = null;
  /**
   * The store keeps a single cached snapshot reference so that
   * `useSyncExternalStore` can short-circuit on Object.is. We only
   * replace the snapshot when a flush actually mutated state.
   */
  private snapshot: BlockStoreState;

  constructor() {
    this.state = createInitialState();
    this.snapshot = this.state;
  }

  /** Subscribe to mutations. Returns an unsubscribe function. */
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Get the current snapshot. Stable reference between flushes. */
  getSnapshot = (): BlockStoreState => this.snapshot;

  /**
   * Queue an event for the next RAF flush.
   *
   * Events that are already pending are NOT deduplicated — the
   * reducer is idempotent and replaying late-arriving updates in
   * order is the safest semantics for streaming text.
   */
  dispatch = (event: AgentFrameInput): void => {
    this.pending.push(event);
    this.scheduleFlush();
  };

  /**
   * Apply many events at once. Used for replay on reconnect — the
   * caller already has the events in array form, so we skip the
   * queue and reduce synchronously.
   */
  hydrate = (
    events: AgentFrameInput[],
    options?: { mode?: "snapshot" | "merge"; correlationId?: string | null },
  ): void => {
    if (events.length === 0) return;
    const mode = options?.mode ?? "merge";
    if (mode === "snapshot") {
      if (this.flushHandle !== null) {
        cancelAnimationFrame(this.flushHandle);
        this.flushHandle = null;
      }
      this.pending = [];
      this.state = {
        ...createInitialState(),
        correlation_id: options?.correlationId ?? this.state.correlation_id,
      };
    }
    let next = this.state;
    for (const event of events) {
      next = applyAgentFrameInput(next, event);
    }
    if (next !== this.state) {
      this.state = next;
      this.snapshot = { ...next, version: next.version + 1 };
      this.notify();
    }
  };

  /** Reset state to a fresh frame keyed by a new correlation ID. */
  reset = (correlationId: string | null): void => {
    if (this.flushHandle !== null) {
      cancelAnimationFrame(this.flushHandle);
      this.flushHandle = null;
    }
    this.pending = [];
    this.state = {
      ...createInitialState(),
      correlation_id: correlationId,
    };
    this.snapshot = this.state;
    this.notify();
  };

  /** Get a block by ID. Returns `undefined` for unknown IDs. */
  getBlock = (id: string): Block | undefined => this.snapshot.byId[id];

  /** Cancel any pending flush. Call on unmount in tests. */
  destroy = (): void => {
    if (this.flushHandle !== null) {
      cancelAnimationFrame(this.flushHandle);
      this.flushHandle = null;
    }
    this.pending = [];
    this.listeners.clear();
  };

  /* ─── internals ──────────────────────────────────────────────── */

  private scheduleFlush(): void {
    if (this.flushHandle !== null) return;
    // Fall back to a microtask under jsdom / SSR where RAF is undefined.
    const schedule =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16);
    this.flushHandle = schedule(this.flush) as unknown as number;
  }

  private flush = (): void => {
    this.flushHandle = null;
    if (this.pending.length === 0) return;

    const batch = this.pending;
    this.pending = [];

    let next = this.state;
    for (const event of batch) {
      next = applyAgentFrameInput(next, event);
    }

    if (next === this.state) {
      // No-op flush — nothing actually changed (e.g. unknown events).
      return;
    }

    this.state = next;
    // Bump version + clone shallowly so Object.is in
    // useSyncExternalStore detects the change.
    this.snapshot = { ...next, version: next.version + 1 };
    this.notify();
  };

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function createInitialState(): BlockStoreState {
  return {
    session_id: null,
    correlation_id: null,
    phase: "idle",
    active_block_id: null,
    todo_list: [],
    interruption: null,
    order: [],
    byId: {},
    last_timestamp: null,
    version: 0,
    aliases: {},
  };
}

/**
 * Module-level singleton — there is only ever one "live trace panel"
 * open at a time. If we ever need to support side-by-side traces we
 * can switch to a Map keyed by correlation_id.
 */
export const blockStore = new BlockStore();

/** Exposed for tests so each spec gets a fresh store. */
export function createBlockStore(): BlockStore {
  return new BlockStore();
}

export type { BlockStore };
