"use client";

import { useMemo } from "react";
import type { ParsedAgentTrace } from "../traceDataParser";
import { buildAgentTree } from "./buildAgentTree";
import AgentSection from "./AgentSection";
import styles from "./AgentTrace.module.css";

interface AgentTraceViewProps {
  agents: ParsedAgentTrace[];
  /** When true, the latest agent response is styled as plan review. */
  awaitingPlanApproval?: boolean;
  /** When true, placeholder post-approval copy is replaced inline. */
  planExecuting?: boolean;
}

/**
 * Top-level entry point for the agent-segregated trace view (v1 legacy
 * renderer — used when a flow produced no persisted v2 block stream).
 * Memoizes the tree build so it only recalculates when agents change.
 */
function AgentTraceView({
  agents,
  awaitingPlanApproval = false,
  planExecuting = false,
}: AgentTraceViewProps) {
  const tree = useMemo(() => buildAgentTree(agents), [agents]);

  if (tree.length === 0) return null;

  return (
    <div className={styles.traceView}>
      {tree.map((node, idx) => (
        <AgentSection
          key={node.id}
          node={node}
          depth={0}
          isRecent={idx >= tree.length - 3}
          showAwaitingApproval={
            awaitingPlanApproval && idx === tree.length - 1 && node.role === "manager"
          }
          showExecuting={planExecuting && idx === tree.length - 1}
        />
      ))}
    </div>
  );
}

export default AgentTraceView;
