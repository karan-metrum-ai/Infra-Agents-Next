import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import Image from "next/image";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./TeamNodePlaceholder.module.css";
import type { TeamNodeData } from "./AgentTeamView.types";

const STATUS_COLOR: Record<string, string> = {
  running: "var(--success)",
  active: "var(--success)",
  idle: "var(--muted)",
  completed: "var(--info, var(--primary))",
  error: "var(--destructive)",
};

/**
 * Minimal ReactFlow node standing in for the real `WorkflowDesigner/AgentNode`
 * (a later-phase component). Swap for the real one once Phase 7 lands.
 *
 * Wrapped in `memo` (Phase 15): React Flow re-renders every custom node
 * component whenever the `nodes` array reference changes, regardless of
 * whether that specific node's data changed — without `memo` here, the
 * 30s health poll in `useAgentTeamHealth.ts` re-renders every agent card
 * in the org chart, not just the ones whose status actually changed.
 */
function TeamNodePlaceholderComponent({ data }: NodeProps<Node<TeamNodeData>>) {
  return (
    <div className={cn(styles.node, data.isOrchestrator && styles.nodeOrchestrator)}>
      <Handle type="target" position={Position.Top} />
      <div className={styles.avatarWrap}>
        {data.avatar ? (
          <Image
            src={data.avatar}
            alt=""
            fill
            sizes="36px"
            style={{ objectFit: "cover" }}
            unoptimized
          />
        ) : (
          <div className={styles.avatarFallback}>
            <Bot size={18} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.label}>{data.label}</span>
        {data.isOrchestrator && <span className={styles.badge}>Orchestrator</span>}
      </div>
      <span
        className={styles.statusDot}
        style={{ background: STATUS_COLOR[data.status] ?? "var(--muted)" }}
        aria-label={`Status: ${data.status}`}
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export const TeamNodePlaceholder = memo(TeamNodePlaceholderComponent);

export default TeamNodePlaceholder;
