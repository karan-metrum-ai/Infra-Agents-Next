import type { Edge, Node } from "@xyflow/react";
import type { AgentSelectedModelClient } from "./AgentNode.types";
import { filterPersistedAgentNodes, filterPersistedEdges } from "./teamCanvas";

const STORAGE_KEY = "twoteam-canvas-config";

export interface WorkflowCanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
  selectedTools: Record<string, string[]>;
  selectedModelClients: Record<string, AgentSelectedModelClient | undefined>;
  agentUserInstructions: Record<string, string>;
}

/**
 * Minimal partial pull-forward of the Vite app's `utils/jsonGenerator.ts`
 * (1568 LOC total — the full file is real Phase 11 scope). That file's
 * `saveCanvasToLocalStorage` also generated a complete backend-payload-shaped
 * "team JSON" and connection/knowledge-bank/instruction "metadata" purely to
 * feed a developer-console debug helper (`setupDeveloperDebugging`) — dropped
 * in this port (see the Phase 7 report: it has zero user-facing behavior,
 * only `window.teamCanvasDebug.*` console helpers). `SaveTeamModal` already
 * builds its own save payload via `buildAdvancedTeamPayload.ts`, so nothing
 * in the real save/deploy flow ever read that generated JSON.
 *
 * Knowledge-bank file persistence is also dropped: the Vite original always
 * called `saveCanvasToLocalStorage` with an empty `{}` knowledge-banks map on
 * every real call site (canvas resync, tool/model changes) — only
 * `generateTeamJSON`'s debug path ever populated it. Restoring it on load
 * was therefore already a no-op in production; this port doesn't carry that
 * dead parameter forward, so knowledge files stay session-only (matching
 * actual Vite behavior, not a regression).
 *
 * Only the genuinely round-tripped canvas draft — persisted agent
 * nodes/edges, per-agent tool selections, per-agent model selections, and
 * per-agent free-text instructions — is written/read here.
 */
export function saveCanvasToLocalStorage(
  nodes: Node[],
  edges: Edge[],
  selectedTools: Record<string, string[]> = {},
  selectedModelClients: Record<string, AgentSelectedModelClient | undefined> = {},
  agentUserInstructions: Record<string, string> = {},
): void {
  try {
    const snapshot: WorkflowCanvasSnapshot = {
      nodes: filterPersistedAgentNodes(nodes),
      edges: filterPersistedEdges(edges),
      selectedTools,
      selectedModelClients,
      agentUserInstructions,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage unavailable (private browsing, quota exceeded) — non-fatal.
  }
}

export function getCanvasFromLocalStorage(): WorkflowCanvasSnapshot | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<WorkflowCanvasSnapshot>;
    return {
      nodes: parsed.nodes ?? [],
      edges: parsed.edges ?? [],
      selectedTools: parsed.selectedTools ?? {},
      selectedModelClients: parsed.selectedModelClients ?? {},
      agentUserInstructions: parsed.agentUserInstructions ?? {},
    };
  } catch {
    return null;
  }
}
