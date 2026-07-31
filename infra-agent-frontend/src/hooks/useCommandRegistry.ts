import { useSyncExternalStore } from "react";
import { useLatestRef } from "./useLatestRef";
import { useMountEffect } from "./useMountEffect";

/**
 * Single global action-registration point for the Cmd+K command palette
 * (`.cursor/rules/frontend/006-cmdk.mdc`). Every user-facing action in the
 * app registers itself here via `useRegisterCommand`; `CommandPalette`
 * (`src/components/CommandPalette/`) only ever reads from this registry —
 * it never defines actions itself.
 *
 * Sans-effect note: registration is a genuine "sync with an external
 * system on mount" case (Pattern 4, `useMountEffect`) — the external
 * system is this module-level registry, which outlives any single
 * component and must be told when a command's owning component
 * mounts/unmounts. Keeping a registered command's payload (label, enabled
 * state, `perform` closure) current as props/state change does NOT need a
 * second effect: the registry entry is updated directly during render,
 * the same "write an external mutable slot unconditionally and
 * idempotently every render" technique this codebase's own
 * `useLatestRef.ts` already documents and sanctions — it never affects
 * what's rendered, so it needs no effect wrapper.
 */

export type CommandGroup = "Navigation" | "Actions" | "Account" | "Recent";

export interface CommandItem {
  id: string;
  label: string;
  group: CommandGroup;
  /** Optional secondary text shown under the label (e.g. a route path). */
  description?: string;
  /** Extra search terms beyond the label. */
  keywords?: string[];
  /** Visible shortcut hint, e.g. `["⌘", "K"]` — rendered via the `Kbd` primitive. */
  shortcut?: string[];
  perform: () => void;
  /** Hide from the palette without unregistering (e.g. a disabled action). */
  disabled?: boolean;
}

const registry = new Map<string, CommandItem>();
const listeners = new Set<() => void>();
let snapshot: CommandItem[] = [];

function notify(): void {
  snapshot = Array.from(registry.values());
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CommandItem[] {
  return snapshot;
}

/** Registers `item`, keeping its payload fresh across re-renders, and unregisters on unmount. */
export function useRegisterCommand(item: CommandItem): void {
  const itemRef = useLatestRef(item);

  useMountEffect(() => {
    registry.set(itemRef.current.id, itemRef.current);
    notify();
    return () => {
      registry.delete(itemRef.current.id);
      notify();
    };
  });

  // Keep the stored entry current every render -- see file doc comment.
  registry.set(item.id, item);
}

/** All currently-registered commands, live-subscribed for `CommandPalette`. */
export function useCommandRegistry(): CommandItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const USAGE_STORAGE_KEY = "infra-agents-command-usage";
const MAX_TRACKED_COMMANDS = 50;

interface UsageMap {
  [commandId: string]: number;
}

function loadUsage(): UsageMap {
  try {
    const raw = localStorage.getItem(USAGE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UsageMap) : {};
  } catch {
    return {};
  }
}

/** Records that `commandId` was just run, for the palette's "Frequently used" section. */
export function recordCommandUsage(commandId: string): void {
  try {
    const usage = loadUsage();
    usage[commandId] = (usage[commandId] ?? 0) + 1;
    const trimmed = Object.fromEntries(
      Object.entries(usage)
        .toSorted(([, a], [, b]) => b - a)
        .slice(0, MAX_TRACKED_COMMANDS),
    );
    localStorage.setItem(USAGE_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage unavailable (private browsing, quota) -- non-fatal
  }
}

/** The `limit` most-used command ids, most-used first, still-registered only. */
export function getFrequentCommandIds(available: CommandItem[], limit = 8): string[] {
  const usage = loadUsage();
  const availableIds = new Set(available.map((item) => item.id));
  return Object.entries(usage)
    .filter(([id]) => availableIds.has(id))
    .toSorted(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);
}
