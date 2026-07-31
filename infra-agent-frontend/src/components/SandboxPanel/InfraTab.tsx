import { Fragment } from "react";
import { formatNum } from "@/lib/formatters";
import type { IdracResult, InfraMetrics } from "@/features/sandbox/sandboxApi.types";
import { TabEmpty } from "./MetricAtoms";
import styles from "./InfraTab.module.css";

/**
 * Infra tab -- collapsible node/GPU/iDRAC metrics rendered generically since
 * the Prometheus / DCGM key set is provider-specific. When the API returns
 * null for `infra_metrics` the tab still renders an explicit "not
 * collected" line so the customer knows the section exists but has
 * nothing.
 *
 * Ported from the Vite app's `components/SandboxPanel/InfraTab.tsx`. Purely
 * a function of props -- no local state/hooks, so no `"use client"`.
 *
 * No type-narrowing deviation needed: `InfraMetrics`'s `node`/`gpu` fields
 * plus its `[k: string]: unknown` catch-all already cover every shape this
 * component reads generically -- the whole point of this tab is rendering
 * an arbitrary, provider-specific key/value tree, not a fixed schema.
 */

interface InfraTabProps {
  data: InfraMetrics | null | undefined;
  idracResult: IdracResult | null | undefined;
}

/** Render a record as a key/value table. */
function KvBlock({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className={styles.kvTable}>
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <span className={styles.kvKey}>{k}</span>
          <span className={styles.kvValue}>
            {typeof v === "number"
              ? formatNum(v)
              : Array.isArray(v)
                ? v.map((x) => (typeof x === "number" ? formatNum(x) : String(x))).join(", ")
                : v == null
                  ? "—"
                  : typeof v === "object"
                    ? JSON.stringify(v)
                    : String(v)}
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export function InfraTab({ data, idracResult }: InfraTabProps) {
  if (!data && !idracResult) {
    return <TabEmpty message="Infra metrics not collected for this run" />;
  }

  const nodeMetrics = data?.node ?? null;
  const gpuMetrics = data?.gpu ?? null;
  const otherKeys = data ? Object.keys(data).filter((k) => k !== "node" && k !== "gpu") : [];

  return (
    <div className={styles.tabPanel}>
      {nodeMetrics ? (
        <>
          <div className={styles.metricSubtitle}>Node metrics</div>
          <KvBlock rows={Object.entries(nodeMetrics)} />
        </>
      ) : (
        <div className={styles.emptyStateInline}>Node metrics not collected</div>
      )}

      {gpuMetrics && Object.keys(gpuMetrics).length > 0 ? (
        Object.entries(gpuMetrics).map(([gpuId, m]) => (
          <Fragment key={gpuId}>
            <div className={styles.metricSubtitle}>GPU {gpuId}</div>
            <KvBlock rows={Object.entries(m)} />
          </Fragment>
        ))
      ) : (
        <div className={styles.emptyStateInline}>GPU metrics not collected</div>
      )}

      {otherKeys.length > 0 && (
        <>
          <div className={styles.metricSubtitle}>Other infra data</div>
          <KvBlock rows={otherKeys.map((k) => [k, (data as InfraMetrics)[k]])} />
        </>
      )}

      <div className={styles.metricSubtitle}>iDRAC scenario</div>
      {idracResult ? (
        <KvBlock rows={Object.entries(idracResult)} />
      ) : (
        <div className={styles.emptyStateInline}>iDRAC scenario not active for this run</div>
      )}
    </div>
  );
}

export default InfraTab;
