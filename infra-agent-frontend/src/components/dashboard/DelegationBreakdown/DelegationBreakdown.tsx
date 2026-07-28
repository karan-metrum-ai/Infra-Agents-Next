import type { CSSProperties } from "react";
import type { DelegationBreakdownProps } from "@/components/dashboard/DelegationBreakdown/DelegationBreakdown.types";
import styles from "@/components/dashboard/DelegationBreakdown/DelegationBreakdown.module.css";

// Color palette for delegation types -- matched via substring against the
// (lowercased) delegation type key, first match wins.
const DELEGATION_COLORS: Record<string, string> = {
  metrumai: "var(--secondary)",
  level1_support: "var(--primary)",
  systems_admin_os: "var(--success)",
  systems_admin_hw: "var(--warning)",
  wlan_network: "var(--color-info)",
  vastai: "var(--accent)",
  default: "var(--muted)",
};

/** Format a delegation type key (e.g. "level1_support") for display. */
function formatDelegationType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve the display color for a delegation type via substring match. */
function getDelegationColor(type: string): string {
  const key = type.toLowerCase();
  for (const [pattern, color] of Object.entries(DELEGATION_COLORS)) {
    if (pattern !== "default" && key.includes(pattern)) {
      return color;
    }
  }
  return DELEGATION_COLORS.default;
}

/**
 * Shows the distribution of delegations by type as a row of colored chips,
 * each labeled with its formatted type name and count.
 */
export default function DelegationBreakdown({
  delegations,
  isLoading = false,
}: DelegationBreakdownProps) {
  const entries = Object.entries(delegations).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (isLoading) {
    return (
      <div className={styles.delegationBreakdown}>
        <div className={styles.delegationHeader}>
          <span className={styles.delegationTitle}>Delegations</span>
        </div>
        <div className={styles.delegationChipsLoading}>
          <div className={styles.chipShimmer} />
          <div className={styles.chipShimmer} />
          <div className={styles.chipShimmer} />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={styles.delegationBreakdown}>
        <div className={styles.delegationHeader}>
          <span className={styles.delegationTitle}>Delegations</span>
          <span className={styles.delegationTotal}>0</span>
        </div>
        <div className={styles.delegationEmpty}>No delegation data</div>
      </div>
    );
  }

  return (
    <div className={styles.delegationBreakdown}>
      <div className={styles.delegationHeader}>
        <span className={styles.delegationTitle}>Delegations</span>
        <span className={styles.delegationTotal}>{total.toLocaleString()}</span>
      </div>

      <div className={styles.delegationChips}>
        {entries.map(([type, count]) => {
          const color = getDelegationColor(type);
          const percentage = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
          const label = formatDelegationType(type);

          return (
            <div
              key={type}
              className={styles.delegationChip}
              style={{ "--chip-color": color } as CSSProperties}
              title={`${label}: ${count} (${percentage}%)`}
            >
              <span
                className={styles.chipDot}
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className={styles.chipLabel}>{label}</span>
              <span className={styles.chipCount}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
