"use client";

import { AlertCircle, Loader2, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/Input/Input";
import {
  useGetCatalogCategoriesQuery,
  useGetCatalogCategoryQuery,
  useLazyGetCatalogCategoryQuery,
} from "@/features/reports/reportsApi";
import type { CatalogCategory, CatalogMetric } from "@/features/reports/reportsApi.types";
import styles from "./CatalogMetricPicker.module.css";

/**
 * Searchable metric picker backed by the catalog API. Ported from the Vite
 * app's `components/ReportBuilder/CatalogMetricPicker.tsx`.
 *
 * Deviation from source: the Vite version hand-rolled category/metric
 * fetching (`getCatalogCategories`/`getCatalogCategory` from `lib/
 * reportApi.ts`) with its own loading/error state. Here that's replaced by
 * this app's real RTK Query hooks (`useGetCatalogCategoriesQuery`,
 * `useGetCatalogCategoryQuery` for the currently-selected category,
 * `useLazyGetCatalogCategoryQuery` for the one-off reverse-lookup below) --
 * per-category responses are cached automatically, so re-visiting a
 * category the user already opened doesn't refetch.
 *
 * Two effects remain (this file does not attempt zero-`useEffect`
 * discipline, which is only mandated for the Phase 7/8 work that
 * documented it): one propagates catalog-reachability up to the parent via
 * `onAvailabilityChange` when the categories query settles, and one runs a
 * single reverse lookup on mount -- if a section already carries a
 * `metric_id`/`data_hint` (e.g. loaded from a saved template) but the
 * picker has no category context yet, it walks categories once to find
 * which one owns that metric so it can be preselected. Both mirror the
 * source's own effect-driven behavior; neither is expressible as a plain
 * derived value because they drive an imperative parent callback and a
 * sequential async search, respectively.
 */

export interface MetricSelectionUpdate {
  metric_id: string;
  data_hint: string[];
  chart_type?: string;
  title?: string;
}

export interface CatalogMetricPickerProps {
  metricId?: string;
  dataHint?: string[];
  chartType?: string;
  sectionTitle?: string;
  onChange: (update: MetricSelectionUpdate) => void;
  onAvailabilityChange?: (available: boolean) => void;
}

const EMPTY_CATEGORIES: readonly CatalogCategory[] = [];
const EMPTY_METRICS: readonly CatalogMetric[] = [];
const DEFAULT_SECTION_TITLES = new Set(["Trend Analysis", "Key Metrics", "Data Table", ""]);

export default function CatalogMetricPicker({
  metricId,
  dataHint,
  chartType,
  sectionTitle,
  onChange,
  onAvailabilityChange,
}: CatalogMetricPickerProps) {
  const [categoryId, setCategoryId] = useState("");
  const [metricQuery, setMetricQuery] = useState("");
  const [reverseLookupMetricId, setReverseLookupMetricId] = useState<string | null>(null);
  const reverseLookupDone = useRef(false);

  const {
    data: categoriesData,
    isLoading: loadingCategories,
    isError: categoriesErrored,
  } = useGetCatalogCategoriesQuery();
  const categories = categoriesData?.categories ?? EMPTY_CATEGORIES;

  const {
    data: categoryData,
    isFetching: loadingMetrics,
    error: metricsError,
  } = useGetCatalogCategoryQuery(categoryId, { skip: !categoryId });
  const metrics = categoryData?.metrics ?? EMPTY_METRICS;

  const [triggerCategory] = useLazyGetCatalogCategoryQuery();

  // Tell the parent panel whether the catalog backend is reachable; it
  // falls back to a manual "data hints" text field when it isn't.
  useEffect(() => {
    onAvailabilityChange?.(!categoriesErrored);
  }, [categoriesErrored, onAvailabilityChange]);

  // One-time reverse lookup: find which category owns an already-known
  // metric_id/data_hint table so it can be preselected. RTK Query caches
  // each per-category fetch triggered here.
  useEffect(() => {
    if (loadingCategories || categories.length === 0 || reverseLookupDone.current) {
      return;
    }
    const hintTable = dataHint?.[0];
    if (!metricId && !hintTable) {
      reverseLookupDone.current = true;
      return;
    }

    let cancelled = false;
    (async () => {
      for (const cat of categories) {
        try {
          // Deliberately sequential: this is a short-circuiting search (stop at the first
          // category containing the metric), not a batch of independent fetches to parallelize.
          // eslint-disable-next-line no-await-in-loop
          const data = await triggerCategory(cat.id).unwrap();
          const match = data.metrics.find(
            (m) => (metricId && m.id === metricId) || (hintTable && m.table === hintTable),
          );
          if (match) {
            if (!cancelled) {
              setCategoryId(cat.id);
              setReverseLookupMetricId(match.id);
            }
            break;
          }
        } catch {
          // Try the next category.
        }
      }
      if (!cancelled) {
        reverseLookupDone.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categories, dataHint, loadingCategories, metricId, triggerCategory]);

  const selectedMetricId = metricId ?? reverseLookupMetricId ?? "";

  const filteredMetrics = useMemo(() => {
    const q = metricQuery.trim().toLowerCase();
    if (!q) {
      return metrics;
    }
    return metrics.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.table.toLowerCase().includes(q),
    );
  }, [metricQuery, metrics]);

  function applyMetric(metric: CatalogMetric) {
    setReverseLookupMetricId(metric.id);
    const shouldApplyChart = !chartType || chartType === "auto" || chartType === "table";
    const update: MetricSelectionUpdate = { metric_id: metric.id, data_hint: [metric.table] };
    if (shouldApplyChart && metric.chart) {
      update.chart_type = metric.chart;
    }
    if (!sectionTitle || DEFAULT_SECTION_TITLES.has(sectionTitle)) {
      update.title = metric.label;
    }
    onChange(update);
  }

  function handleCategorySelect(catId: string) {
    setCategoryId(catId);
    setReverseLookupMetricId(null);
    setMetricQuery("");
  }

  if (loadingCategories) {
    return (
      <div className={styles.catalogLoading}>
        <Loader2 className={styles.spinner} size={16} />
        <span>Loading metric catalog...</span>
      </div>
    );
  }

  if (categoriesErrored) {
    return (
      <div
        className={styles.panelWarning}
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a load-failure notice, which `role="status"` models more accurately.
        role="status"
      >
        <AlertCircle size={14} className={styles.panelWarningIcon} />
        <span>Failed to load metric categories.</span>
      </div>
    );
  }

  return (
    <div className={styles.catalogPicker}>
      <div className={styles.catalogStep}>
        <span className={styles.catalogStepLabel}>Category</span>
        <div
          className={styles.categoryPillRow}
          // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom pill listbox; a native <select> can't render count badges per option
          role="listbox"
          aria-label="Metric categories"
        >
          {categories.map((cat) => {
            const active = categoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom listbox option pill, not a native <option>
                role="option"
                aria-selected={active}
                className={active ? styles.categoryPillActive : styles.categoryPill}
                onClick={() => handleCategorySelect(cat.id)}
              >
                {cat.label}
                <span className={styles.categoryPillCount}>{cat.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.catalogStep}>
        <span className={styles.catalogStepLabel}>Metric</span>

        {!categoryId && <div className={styles.catalogEmptyHint}>Pick a category first.</div>}

        {categoryId && loadingMetrics && (
          <div className={styles.catalogLoading}>
            <Loader2 className={styles.spinner} size={14} />
            <span>Loading metrics...</span>
          </div>
        )}

        {categoryId && !loadingMetrics && !metricsError && metrics.length === 0 && (
          <div className={styles.catalogEmptyHint}>
            <span>No metrics in this category.</span>
          </div>
        )}

        {categoryId && !loadingMetrics && metrics.length > 0 && (
          <>
            <div className={styles.metricSearchWrap}>
              <Search size={14} className={styles.metricSearchIcon} aria-hidden />
              <Input
                type="search"
                aria-label="Search metrics"
                placeholder="Search metrics..."
                value={metricQuery}
                onChange={(e) => setMetricQuery(e.target.value)}
                style={{ paddingLeft: 30, paddingRight: metricQuery ? 30 : undefined }}
              />
              {metricQuery && (
                <button
                  type="button"
                  className={styles.metricSearchClear}
                  aria-label="Clear search"
                  onClick={() => setMetricQuery("")}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div
              className={styles.metricList}
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom rich-content listbox; a native <select> can't render label + chart/unit meta
              role="listbox"
              aria-label="Metrics"
            >
              {filteredMetrics.length === 0 && (
                <div className={styles.catalogEmptyHint}>
                  <span>No metrics match your search.</span>
                </div>
              )}
              {filteredMetrics.map((metric) => {
                const active = selectedMetricId === metric.id;
                return (
                  <button
                    key={metric.id}
                    type="button"
                    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom listbox option row, not a native <option>
                    role="option"
                    aria-selected={active}
                    aria-label={metric.label}
                    className={active ? styles.metricListItemActive : styles.metricListItem}
                    onClick={() => applyMetric(metric)}
                  >
                    <span className={styles.metricListItemBody}>
                      <span className={styles.metricListItemLabel}>{metric.label}</span>
                      <span className={styles.metricListItemMeta}>
                        {metric.chart}
                        {metric.unit ? ` · ${metric.unit}` : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {metricsError && (
          <div
            className={styles.panelWarning}
            // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- `<output>` is scoped to form-calculation results; this is a load-failure notice, which `role="status"` models more accurately.
            role="status"
          >
            <AlertCircle size={14} className={styles.panelWarningIcon} />
            <span>Failed to load metrics.</span>
          </div>
        )}
      </div>
    </div>
  );
}
