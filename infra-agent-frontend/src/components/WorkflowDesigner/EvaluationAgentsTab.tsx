"use client";

import { useState } from "react";
import { Activity, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, getScoreColor } from "./evaluationModalFormatters";
import { EvaluationAgentStepCard } from "./EvaluationAgentStepCard";
import styles from "./EvaluationModal.module.css";
import type { TrajectoryData } from "./EvaluationModal.types";

type AgentFilter = "all" | "success" | "error";

interface EvaluationAgentsTabProps {
  trajectoryData: TrajectoryData | null;
  isLoading: boolean;
}

/** "Agent Performance" tab: per-agent summary cards that expand to show
 * every execution step. Owns its own filter/expanded-agent UI state since
 * neither is needed outside this tab. */
export function EvaluationAgentsTab({ trajectoryData, isLoading }: EvaluationAgentsTabProps) {
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const agents = trajectoryData?.agents ?? [];
  const filteredAgents = agents.filter(
    (agent) =>
      agentFilter === "all" ||
      (agentFilter === "success" && agent.failed_steps === 0) ||
      (agentFilter === "error" && agent.failed_steps > 0),
  );

  return (
    <div className={styles.agentsTab}>
      <div className={styles.agentsHeader}>
        <div className={styles.agentHeaderTop}>
          <h3 className={styles.sectionTitle}>Agent Performance Analysis</h3>
        </div>
        <select
          value={agentFilter}
          onChange={(event) => setAgentFilter(event.target.value as AgentFilter)}
          className={styles.filterSelect}
          aria-label="Filter agents"
        >
          <option value="all">All Agents</option>
          <option value="success">Successful</option>
          <option value="error">With Errors</option>
        </select>
      </div>

      {isLoading && !trajectoryData ? (
        <div className={styles.agentsLoading}>
          <Loader2 size={32} className={styles.loadingIcon} aria-hidden="true" />
          <p className={styles.loadingText}>Loading agent performance data...</p>
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className={styles.agentsList}>
          {filteredAgents.map((agent) => {
            const isExpanded = expandedAgent === agent.agent_name;
            return (
              <div
                key={agent.agent_name}
                className={cn(styles.agentCard, isExpanded && styles.expanded)}
              >
                <button
                  type="button"
                  className={styles.agentHeader}
                  onClick={() => setExpandedAgent(isExpanded ? null : agent.agent_name)}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.agentInfo}>
                    <h4 className={styles.agentName}>{agent.agent_name}</h4>
                    <p className={styles.agentRole}>{agent.agent_role}</p>
                  </div>
                  <div className={styles.agentMetrics}>
                    <div className={styles.agentMetric}>
                      <span className={styles.metricLabel}>Steps</span>
                      <span className={styles.metricValue}>{agent.total_steps}</span>
                    </div>
                    <div className={styles.agentMetric}>
                      <span className={styles.metricLabel}>Success</span>
                      <span className={styles.metricValue}>{agent.successful_steps}</span>
                    </div>
                    <div className={styles.agentMetric}>
                      <span className={styles.metricLabel}>Avg Score</span>
                      <span
                        className={styles.metricValue}
                        style={{ color: getScoreColor(agent.average_score) }}
                      >
                        {agent.average_score.toFixed(1)}
                      </span>
                    </div>
                    <div className={styles.agentMetric}>
                      <span className={styles.metricLabel}>Duration</span>
                      <span className={styles.metricValue}>
                        {formatDuration(agent.total_duration)}
                      </span>
                    </div>
                  </div>
                  <div className={styles.agentExpandIcon} aria-hidden="true">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </button>
                {isExpanded && (
                  <div className={styles.agentSteps}>
                    {(agent.steps ?? []).map((step, index) => (
                      <EvaluationAgentStepCard key={step.step_id} step={step} index={index} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.noData}>
          <Activity size={48} aria-hidden="true" />
          <h3>No Agent Data Available</h3>
          <p>Agent performance data will appear here once the evaluation is complete.</p>
        </div>
      )}
    </div>
  );
}

export default EvaluationAgentsTab;
