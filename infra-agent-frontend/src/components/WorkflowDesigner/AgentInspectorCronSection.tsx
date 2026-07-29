"use client";

import { useState, type ChangeEvent } from "react";
import { Clock, FileText } from "lucide-react";
import styles from "./AgentInspectorPanel.module.css";
import type { CronJobConfig } from "./AgentInspectorPanel.types";

interface AgentInspectorCronSectionProps {
  cronJobConfig: CronJobConfig;
  onCronJobConfigChange?: (config: CronJobConfig) => void;
}

/**
 * "Configure Cron Job" section: interval + query inputs for scheduling an
 * automated task run for the selected agent. Local state is seeded
 * directly from the `cronJobConfig` prop — the parent (`AgentInspectorPanel`)
 * remounts this section with `key={agentKey}` per agent, so that seed is
 * naturally fresh per agent without a prop-sync `useEffect`.
 */
export function AgentInspectorCronSection({
  cronJobConfig,
  onCronJobConfigChange,
}: AgentInspectorCronSectionProps) {
  const [localConfig, setLocalConfig] = useState<CronJobConfig>(cronJobConfig);

  const handleChange = (field: keyof CronJobConfig) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = { ...localConfig, [field]: event.target.value };
    setLocalConfig(next);
    onCronJobConfigChange?.(next);
  };

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Configure Cron Job</h3>
        <div className={styles.sectionHint}>Schedule automated tasks</div>
      </header>
      <div className={styles.cronJobContainer}>
        <div className={styles.cronInputGroup}>
          <label className={styles.cronInputLabel} htmlFor="agent-inspector-cron-interval">
            <Clock className={styles.cronInputIcon} aria-hidden="true" />
            <span>Interval</span>
          </label>
          <input
            id="agent-inspector-cron-interval"
            type="text"
            className={styles.cronInput}
            placeholder="e.g., 0 */5 * * * (every 5 minutes)"
            value={localConfig.interval}
            onChange={handleChange("interval")}
          />
        </div>
        <div className={styles.cronInputGroup}>
          <label className={styles.cronInputLabel} htmlFor="agent-inspector-cron-query">
            <FileText className={styles.cronInputIcon} aria-hidden="true" />
            <span>Query</span>
          </label>
          <input
            id="agent-inspector-cron-query"
            type="text"
            className={styles.cronInput}
            placeholder="Enter your query here..."
            value={localConfig.query}
            onChange={handleChange("query")}
          />
        </div>
      </div>
    </section>
  );
}

export default AgentInspectorCronSection;
