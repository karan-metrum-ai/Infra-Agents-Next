"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Server, Users } from "lucide-react";
import type { CommandCenterAgentActivityResponse } from "@/features/infrastructure/infrastructureApi.types";
import { AgentAvatarStack } from "./AgentAvatarStack";
import { PanelEmpty, PanelLoading } from "./PanelStates";
import { formatRelativeTime } from "./commandCenterFormatters";
import styles from "./BottomStatsRow.module.css";

interface AgentActivityCardProps {
  agentActivity?: CommandCenterAgentActivityResponse | null;
  isLoading?: boolean;
  hasError?: boolean;
}

export function AgentActivityCard({ agentActivity, isLoading, hasError }: AgentActivityCardProps) {
  const router = useRouter();
  const summary = agentActivity?.summary;
  const teams = useMemo(() => (agentActivity?.teams ?? []).slice(0, 3), [agentActivity]);

  return (
    <div className={`${styles.card} ${styles.cardOverflowVisible}`}>
      <div className={styles.cardHeader}>
        <Users size={14} aria-hidden="true" />
        <span>Agent Team Activity</span>
      </div>
      {hasError ? (
        <PanelEmpty
          icon={<AlertCircle size={18} />}
          title="Could not load team activity"
          subtitle="Check connectivity and try again"
        />
      ) : isLoading && !agentActivity ? (
        <PanelLoading message="Loading teams..." />
      ) : (
        <>
          {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would add a visible border/legend that doesn't fit this compact stat strip */}
          <div className={styles.summaryStrip} role="group" aria-label="Team activity summary">
            <div className={styles.summaryItem}>
              <strong>{summary?.teams ?? 0}</strong>
              <span>Teams</span>
            </div>
            <div className={styles.summaryItem}>
              <strong>{summary?.agents ?? 0}</strong>
              <span>Agents</span>
            </div>
            <div className={styles.summaryItem}>
              <strong className={styles.valGood}>{summary?.active ?? 0}</strong>
              <span>Active</span>
            </div>
            <div className={styles.summaryItem}>
              <strong>{summary?.idle ?? 0}</strong>
              <span>Idle</span>
            </div>
            <div className={styles.summaryItem}>
              <strong className={styles.valBad}>{summary?.issues ?? 0}</strong>
              <span>Issues</span>
            </div>
          </div>
          <ul className={styles.teamsList}>
            {teams.length === 0 ? (
              <li>
                <div className={styles.teamRow}>
                  <div className={styles.teamInfo}>
                    <span className={styles.teamName}>No deployed teams</span>
                  </div>
                </div>
              </li>
            ) : (
              teams.map((team) => {
                const isLive = team.status === "live";
                const clusterId = team.cluster_id != null ? String(team.cluster_id) : null;
                const openTeam = () => {
                  if (!clusterId) return;
                  router.push(`/dashboard/live/teams?cluster=${encodeURIComponent(clusterId)}`);
                };
                return (
                  <li key={team.team_id}>
                    <button
                      type="button"
                      className={styles.teamRow}
                      disabled={!clusterId}
                      onClick={openTeam}
                      aria-label={
                        clusterId
                          ? `Open Agentic Team for cluster-${clusterId}`
                          : "Team has no cluster id"
                      }
                    >
                      <div className={styles.teamInfo}>
                        <div className={styles.teamTitleRow}>
                          <span className={styles.teamName}>
                            {team.team_name || "Unnamed team"}
                          </span>
                          {isLive && <span className={styles.teamActiveBadge}>live now</span>}
                        </div>
                        <span className={styles.teamCluster}>
                          <Server size={9} strokeWidth={2.25} aria-hidden="true" />
                          {clusterId ? `cluster-${clusterId}` : "—"}
                        </span>
                        <span className={styles.teamMeta}>
                          {team.activity_error
                            ? team.activity_error
                            : isLive
                              ? `${team.agent_count} agents · live`
                              : `${team.agent_count} agents · idle ${formatRelativeTime(team.last_activity_at)}`}
                        </span>
                      </div>
                      <div className={styles.teamAside}>
                        <AgentAvatarStack members={team.members} isLive={isLive} />
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </div>
  );
}

export default AgentActivityCard;
