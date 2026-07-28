import { Activity, Bot, Play, Radio, Shield, Zap } from "lucide-react";
import styles from "./AgentTeamView.module.css";

const STATUS_COLOR: Record<string, string> = {
  healthy: "var(--success)",
  ready: "var(--success)",
  processing: "var(--warning)",
  running: "var(--warning)",
  error: "var(--destructive)",
  failed: "var(--destructive)",
};

function statusColor(status: string): string {
  return STATUS_COLOR[status.toLowerCase()] ?? "var(--muted)";
}

interface StatsHeaderProps {
  teamHealthStatus: string;
  systemStatus: string;
  activeAgents: number;
  totalAgents: number;
  apiAgents: number;
  isPolling: boolean;
}

export function StatsHeader({
  teamHealthStatus,
  systemStatus,
  activeAgents,
  totalAgents,
  apiAgents,
  isPolling,
}: StatsHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.statsContainer}>
        <div className={styles.statCard} style={{ borderColor: statusColor(teamHealthStatus) }}>
          <Shield
            className={styles.statIcon}
            style={{ color: statusColor(teamHealthStatus) }}
            aria-hidden="true"
          />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{teamHealthStatus.toUpperCase()}</span>
            <span className={styles.statLabel}>Team Health</span>
          </div>
        </div>

        <div className={styles.statCard} style={{ borderColor: statusColor(systemStatus) }}>
          <Activity
            className={styles.statIcon}
            style={{ color: statusColor(systemStatus) }}
            aria-hidden="true"
          />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{systemStatus.toUpperCase()}</span>
            <span className={styles.statLabel}>System</span>
          </div>
          {isPolling && <Radio className={styles.pulsingIcon} size={12} aria-hidden="true" />}
        </div>

        <div className={styles.statCard}>
          <Play
            className={styles.statIcon}
            style={{ color: "var(--success)" }}
            aria-hidden="true"
          />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{activeAgents}</span>
            <span className={styles.statLabel}>Active</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <Bot className={styles.statIcon} style={{ color: "var(--primary)" }} aria-hidden="true" />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{totalAgents}</span>
            <span className={styles.statLabel}>Flow Agents</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <Zap
            className={styles.statIcon}
            style={{ color: "var(--secondary)" }}
            aria-hidden="true"
          />
          <div className={styles.statInfo}>
            <span className={styles.statValue}>{apiAgents}</span>
            <span className={styles.statLabel}>API Agents</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsHeader;
