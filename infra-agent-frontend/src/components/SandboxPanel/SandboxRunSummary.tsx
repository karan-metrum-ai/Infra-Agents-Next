"use client";

import { ListChecks } from "lucide-react";
import styles from "./SandboxConfigForm.module.css";
import type { SandboxSectionProps } from "./SandboxConfigForm.types";

/** Read-only sidebar preview of the current form selections -- pure
 * presentation over RHF's `watch()`, no new state or validation. Gives a
 * running confirmation of what "Start sandbox run" will submit, per the
 * ui-ux skill's Forms & Feedback guidance (visible state before submit). */
export function SandboxRunSummary({ form }: SandboxSectionProps) {
  const { watch } = form;
  const machineCount = watch("machineCount");
  const team = watch("team");
  const kbSourceType = watch("kbSourceType");
  const kbFileName = watch("kbFileName");
  const numQueries = watch("numQueries");
  const concurrency = watch("concurrency");
  const modelId = watch("modelId");
  const enableOptimization = watch("enableOptimization");

  return (
    <div className={styles.summaryCard}>
      <div className={styles.configSectionHeader}>
        <ListChecks size={14} className={styles.configSectionIcon} aria-hidden="true" />
        <span>Run summary</span>
      </div>
      <dl className={styles.summaryList}>
        <div className={styles.summaryRow}>
          <dt>Machines</dt>
          <dd>{machineCount || 0}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Agents</dt>
          <dd>{team.length > 0 ? `${team.length} selected` : "None selected"}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Dataset</dt>
          <dd>
            {kbSourceType === "custom" ? kbFileName || "Custom (pending upload)" : "Built-in KB"}
          </dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Queries</dt>
          <dd>
            {numQueries || 0} @ {concurrency || 0}x
          </dd>
        </div>
        {modelId && (
          <div className={styles.summaryRow}>
            <dt>Model</dt>
            <dd className={styles.summaryMono}>{modelId}</dd>
          </div>
        )}
        {enableOptimization && (
          <div className={styles.summaryRow}>
            <dt>Optimization</dt>
            <dd>DSPy enabled</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default SandboxRunSummary;
