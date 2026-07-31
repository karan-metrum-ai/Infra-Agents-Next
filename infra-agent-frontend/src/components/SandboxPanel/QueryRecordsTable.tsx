"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QueryScore } from "@/features/sandbox/sandboxApi.types";
import styles from "./QueryRecordsTable.module.css";

/**
 * QueryRecordsTable -- detailed per-query results from a sandbox report.
 *
 * Reads `query_scores` directly from the report prop instead of making a
 * separate API call. Sort/filter is client-side and entirely local state
 * (no server round-trip), so a plain `useState`/`useMemo` combo is enough --
 * no `useEffect` needed.
 *
 * Ported from the Vite app's `components/SandboxPanel/QueryRecordsTable.tsx`.
 *
 * Deviation from source (documented, not invented): the source's sort/filter
 * controls are two native `<select>` elements, not clickable column headers
 * -- there is no `onClick` handler on any `<th>` anywhere in the original
 * component (the `cursor: pointer`/`.qrSortIcon` rules in the old shared
 * `SandboxPanel.module.css` are dead CSS for this component, confirmed by
 * grep -- they're unused artifacts, not a feature this component implements).
 * `<select>` is natively fully keyboard-operable, so no `aria-sort`/button
 * conversion was needed there; the expand toggle was already a real
 * `<button>`, now additionally given `aria-expanded` + a descriptive
 * `aria-label` for screen readers.
 */
interface QueryRecordsTableProps {
  queryScores: QueryScore[];
}

type SortKey = "default" | "score" | "duration" | "status";

export function QueryRecordsTable({ queryScores }: QueryRecordsTableProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const filtered = useMemo(() => {
    const f = queryScores.filter((r) => {
      if (statusFilter === "all") return true;
      return r.status === statusFilter;
    });

    const sorted = [...f];
    if (sortKey === "default") {
      sorted.sort((a, b) => {
        if (a.status !== b.status) return a.status === "error" ? -1 : 1;
        return a.score - b.score;
      });
    } else if (sortKey === "score") {
      sorted.sort((a, b) => a.score - b.score);
    } else if (sortKey === "duration") {
      sorted.sort((a, b) => b.duration_ms - a.duration_ms);
    } else if (sortKey === "status") {
      sorted.sort((a, b) => a.status.localeCompare(b.status));
    }
    return sorted;
  }, [queryScores, statusFilter, sortKey]);

  if (queryScores.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Queries</h3>
        </div>
        <div className={styles.emptyStateInline}>No query records available.</div>
      </section>
    );
  }

  const errorCount = queryScores.filter((q) => q.status === "error").length;
  const successCount = queryScores.filter((q) => q.status === "success").length;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Queries ({queryScores.length})</h3>
        <span className={styles.sectionSubtitle}>
          {successCount} success, {errorCount} errors
        </span>
      </div>

      <div className={styles.filtersBar}>
        <label>
          <span className={styles.visuallyHidden}>Filter by status</span>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "success" | "error")}
          >
            <option value="all">All ({queryScores.length})</option>
            <option value="error">Errors only</option>
            <option value="success">Successes only</option>
          </select>
        </label>
        <label>
          <span className={styles.visuallyHidden}>Sort queries</span>
          <select
            className={styles.filterSelect}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="default">Errors first, then lowest score</option>
            <option value="score">By score (ascending)</option>
            <option value="duration">By duration (descending)</option>
            <option value="status">By status</option>
          </select>
        </label>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: 32 }} scope="col">
                <span className={styles.visuallyHidden}>Expand</span>
              </th>
              <th scope="col">#</th>
              <th scope="col">Query</th>
              <th scope="col">Score</th>
              <th scope="col">Tool</th>
              <th scope="col">Param</th>
              <th scope="col">Order</th>
              <th scope="col">Duration</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => {
              const isOpen = expanded[q.query_idx] === true;
              const isFailed = q.status === "error";
              return (
                <Fragment key={q.query_idx}>
                  <tr className={cn(isFailed && styles.rowFail)}>
                    <td>
                      <button
                        type="button"
                        className={styles.expandButton}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} details for query ${q.query_idx}`}
                        onClick={() => setExpanded((m) => ({ ...m, [q.query_idx]: !isOpen }))}
                      >
                        {isOpen ? (
                          <ChevronDown size={14} aria-hidden="true" />
                        ) : (
                          <ChevronRight size={14} aria-hidden="true" />
                        )}
                      </button>
                    </td>
                    <td>{q.query_idx}</td>
                    <td className={cn(styles.cellMono, styles.queryCell)}>
                      {q.query_text.slice(0, 100)}
                      {q.query_text.length > 100 ? "..." : ""}
                    </td>
                    <td className={styles.scoreCell}>{q.score.toFixed(3)}</td>
                    <td>{q.tool_match.toFixed(2)}</td>
                    <td>{q.param_match.toFixed(2)}</td>
                    <td>{q.order_valid.toFixed(2)}</td>
                    <td className={styles.cellMono}>{(q.duration_ms / 1000).toFixed(1)}s</td>
                    <td>{q.status}</td>
                  </tr>
                  {isOpen && (
                    <tr className={styles.expandRow}>
                      <td colSpan={9}>
                        <div className={styles.kvTable}>
                          <span className={styles.kvKey}>Full query</span>
                          <span className={cn(styles.kvValue, styles.kvValuePre)}>
                            {q.query_text}
                          </span>
                          <span className={styles.kvKey}>Tools called</span>
                          <span className={styles.kvValue}>
                            {q.tools_called.length > 0 ? q.tools_called.join(", ") : "None"}
                          </span>
                          <span className={styles.kvKey}>Reasoning score</span>
                          <span className={styles.kvValue}>{q.reasoning.toFixed(3)}</span>
                          {q.error && (
                            <>
                              <span className={styles.kvKey}>Error</span>
                              <span className={cn(styles.kvValue, styles.kvValueError)}>
                                {q.error}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default QueryRecordsTable;
