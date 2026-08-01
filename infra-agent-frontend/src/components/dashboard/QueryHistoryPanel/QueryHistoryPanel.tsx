"use client";

/**
 * Query History list — panel 3 of `TeamsDashboard` before a query is
 * selected (see `TeamsDashboard.tsx`, which swaps this for `QueryTracePanel`
 * once one is). No dedicated component existed for this in the Vite
 * source — it was inline JSX in `TeamsDashboard.tsx` — built fresh here.
 * The Vite source's separate "Cron Jobs" history-view toggle was left out:
 * out of the scope of what was asked for, and addable later behind
 * `useFlowStream`'s existing `setHistoryMode` without touching this panel.
 */

import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import RecentFlowsSkeleton from "@/components/QueryTrace/skeletons/RecentFlowsSkeleton";
import { flowStatusCategory, flowListDisplayStatus } from "@/components/QueryTrace/flowStreamApi";
import { resolveFlowDisplayQuery } from "@/utils/resolveFlowDisplayQuery";
import { formatTimestamp } from "@/components/WorkflowDesigner/evaluationModalFormatters";
import { cn } from "@/lib/utils";
import styles from "./QueryHistoryPanel.module.css";
import type { FlowStatusFilter, QueryHistoryPanelProps } from "./QueryHistoryPanel.types";

const STATUS_FILTERS: { id: FlowStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
  { id: "others", label: "Others" },
];

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function QueryHistoryPanel({
  flows,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  activeCorrelationId,
  onSelectFlow,
}: QueryHistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FlowStatusFilter>("all");

  const filteredFlows = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    return flows.filter((flow) => {
      if (statusFilter !== "all" && flowStatusCategory(flow) !== statusFilter) return false;
      if (!search) return true;
      const displayQuery = resolveFlowDisplayQuery(flow) || flow.query || "";
      return displayQuery.toLowerCase().includes(search);
    });
  }, [flows, searchQuery, statusFilter]);

  const hasFiltersActive = searchQuery.trim().length > 0 || statusFilter !== "all";

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>Query History</span>
        <span className={styles.badge}>
          {hasFiltersActive ? `${filteredFlows.length}/${flows.length}` : flows.length}
        </span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search queries..."
            aria-label="Search query history"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would add a visible border/legend that doesn't fit this compact filter-tag row */}
        <div className={styles.filterTags} role="group" aria-label="Filter query history by status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={cn(styles.filterTag, statusFilter === filter.id && styles.filterTagActive)}
              data-filter={filter.id}
              aria-pressed={statusFilter === filter.id}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        {loading && flows.length === 0 ? (
          <RecentFlowsSkeleton rows={5} />
        ) : flows.length === 0 ? (
          <div className={styles.empty}>
            <Eye size={20} aria-hidden="true" />
            <span>No queries yet</span>
            <span className={styles.emptyHint}>
              Manual chat and action queries appear here after each run (refreshes every 30s).
            </span>
          </div>
        ) : filteredFlows.length === 0 ? (
          <div className={styles.empty}>
            <Search size={20} aria-hidden="true" />
            <span>No matching queries</span>
            <span className={styles.emptyHint}>Try a different search term or status filter.</span>
            <button
              type="button"
              className={styles.clearFiltersBtn}
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className={styles.flowsList}>
            {filteredFlows.map((flow) => {
              const isLive = flow.correlation_id === activeCorrelationId;
              const displayStatus = flowListDisplayStatus(flow);
              const displayQuery = resolveFlowDisplayQuery(flow) || flow.query || "Untitled query";
              return (
                <button
                  type="button"
                  key={flow.correlation_id || flow.session_id}
                  className={styles.flowItem}
                  onClick={() => onSelectFlow(flow)}
                >
                  <div className={styles.flowItemTop}>
                    <span className={styles.flowQuery} title={displayQuery}>
                      {truncate(displayQuery, 52)}
                    </span>
                    {isLive && <span className={styles.liveBadge}>Live</span>}
                  </div>
                  <div className={styles.flowItemBottom}>
                    <span className={styles.flowTime}>
                      {formatTimestamp(flow.created_at || flow.completed_at || "")}
                    </span>
                    <span className={styles.flowStatus} data-status={displayStatus.toLowerCase()}>
                      {displayStatus}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {hasMore && !hasFiltersActive && (
          <button
            type="button"
            className={styles.loadMoreBtn}
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more queries"}
          </button>
        )}
      </div>
    </aside>
  );
}

export default QueryHistoryPanel;
