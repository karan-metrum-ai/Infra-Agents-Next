/**
 * Resolves the user's original question for Query History and trace headers.
 *
 * Partial pull-forward ahead of Phase 13 (`utils/resolveFlowDisplayQuery.ts`
 * in the source app) — `QueryTracePanel.tsx`/`TraceHeader.tsx`/
 * `PlanApprovalCard.tsx` (Phase 8) need it now; reconcile with the real
 * Phase 13 util port when that phase lands instead of keeping two copies.
 */

import type { FlowListItem, PlanBundle } from "../components/QueryTrace/flowPayload.types";
import { looksLikeDelegatedTaskGoal } from "../components/QueryTrace/flowListMerge";

export interface ResolveFlowDisplayQueryOptions {
  planBundle?: PlanBundle | null;
  flowData?: Record<string, unknown> | null;
  activeConversationQuery?: string | null;
  traceAgents?: Array<{ query?: string; name?: string }>;
}

/**
 * Pick the best display string for the user's original question.
 *
 * Resolution order:
 * 1. Active conversation query (live submit)
 * 2. Plan bundle query (orchestrator plan)
 * 3. Flow snapshot original_query
 * 4. List row query when it does not look like a delegated task goal
 * 5. First root trace agent query (non-delegated)
 */
export function resolveFlowDisplayQuery(
  flow?: Pick<FlowListItem, "query"> | null,
  options: ResolveFlowDisplayQueryOptions = {},
): string {
  const { planBundle, flowData, activeConversationQuery, traceAgents } = options;

  const candidates: string[] = [];

  if (activeConversationQuery?.trim()) {
    candidates.push(activeConversationQuery.trim());
  }
  if (planBundle?.query?.trim()) {
    candidates.push(planBundle.query.trim());
  }
  const originalQuery = flowData?.original_query;
  if (typeof originalQuery === "string" && originalQuery.trim()) {
    candidates.push(originalQuery.trim());
  }
  if (flow?.query?.trim() && !looksLikeDelegatedTaskGoal(flow.query)) {
    candidates.push(flow.query.trim());
  }
  if (traceAgents?.length) {
    const rootAgent = traceAgents.find((agent) => {
      const name = (agent.name ?? "").toLowerCase();
      return (
        name.includes("operations_manager") ||
        name.includes("operations-manager") ||
        name.includes("operations manager")
      );
    });
    const rootQuery = rootAgent?.query?.trim();
    if (rootQuery && !looksLikeDelegatedTaskGoal(rootQuery)) {
      candidates.push(rootQuery);
    }
    for (const agent of traceAgents) {
      const q = agent.query?.trim();
      if (q && !looksLikeDelegatedTaskGoal(q)) {
        candidates.push(q);
        break;
      }
    }
  }
  if (flow?.query?.trim()) {
    candidates.push(flow.query.trim());
  }

  return candidates.find((q) => q.length > 0) ?? "";
}
