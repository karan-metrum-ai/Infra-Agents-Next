"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs/Tabs";
import type {
  IdracResult,
  InfraMetrics,
  MetricsSnapshot,
} from "@/features/sandbox/sandboxApi.types";
import { AccuracyTab } from "./AccuracyTab";
import { DagTasksTab } from "./DagTasksTab";
import { ErrorsTab } from "./ErrorsTab";
import { GpuTab } from "./GpuTab";
import { InfraTab } from "./InfraTab";
import { LatencyTab } from "./LatencyTab";
import { ThroughputTab } from "./ThroughputTab";
import { TokensTab } from "./TokensTab";
import styles from "./MetricsDeepDive.module.css";

/**
 * MetricsDeepDive -- Layer 3 of the Sandbox Panel.
 *
 * Tab container exposing all 8 metric families. The active tab can be
 * driven from outside (so a verdict click can scroll-link in) via the
 * `activeTab` + `onTabChange` controlled props.
 *
 * Ported from the Vite app's `components/SandboxPanel/MetricsDeepDive.tsx`.
 * Deviation: the source hand-rolled its own `role="tab"` button strip. This
 * app already has a real Base-UI-backed `Tabs`/`TabsList`/`TabsTrigger`/
 * `TabsContent` primitive (`src/components/ui/Tabs`), so the tab bar is
 * built on that instead (`variant="default"`, wrapped so 8 tabs can flow
 * onto a second row on narrow viewports instead of overflowing).
 */

export type MetricTabKey =
  | "throughput"
  | "latency"
  | "accuracy"
  | "errors"
  | "tokens"
  | "dag_task"
  | "gpu"
  | "infra";

interface MetricsDeepDiveProps {
  metrics: MetricsSnapshot | null;
  infraMetrics: InfraMetrics | null;
  idracResult: IdracResult | null;
  activeTab: MetricTabKey;
  onTabChange: (tab: MetricTabKey) => void;
}

const TABS: Array<{ key: MetricTabKey; label: string }> = [
  { key: "throughput", label: "Throughput" },
  { key: "latency", label: "Latency" },
  { key: "accuracy", label: "Accuracy" },
  { key: "errors", label: "Errors" },
  { key: "tokens", label: "Tokens" },
  { key: "dag_task", label: "DAG / Tasks" },
  { key: "gpu", label: "GPU" },
  { key: "infra", label: "Infra" },
];

export function MetricsDeepDive({
  metrics,
  infraMetrics,
  idracResult,
  activeTab,
  onTabChange,
}: MetricsDeepDiveProps) {
  return (
    <section className={styles.section} id="metrics-deep-dive">
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Metrics</h3>
        <span className={styles.sectionSubtitle}>Breakdown</span>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as MetricTabKey)}>
        <TabsList variant="default" className={styles.tabsList}>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="throughput" className={styles.tabsContent}>
          <ThroughputTab data={metrics?.throughput} />
        </TabsContent>
        <TabsContent value="latency" className={styles.tabsContent}>
          <LatencyTab data={metrics?.latency} />
        </TabsContent>
        <TabsContent value="accuracy" className={styles.tabsContent}>
          <AccuracyTab data={metrics?.accuracy} />
        </TabsContent>
        <TabsContent value="errors" className={styles.tabsContent}>
          <ErrorsTab data={metrics?.errors} />
        </TabsContent>
        <TabsContent value="tokens" className={styles.tabsContent}>
          <TokensTab data={metrics?.tokens} />
        </TabsContent>
        <TabsContent value="dag_task" className={styles.tabsContent}>
          <DagTasksTab data={metrics?.dag_task} />
        </TabsContent>
        <TabsContent value="gpu" className={styles.tabsContent}>
          <GpuTab data={metrics?.gpu} />
        </TabsContent>
        <TabsContent value="infra" className={styles.tabsContent}>
          <InfraTab data={infraMetrics} idracResult={idracResult} />
        </TabsContent>
      </Tabs>
    </section>
  );
}

export default MetricsDeepDive;
