"use client";

import { Loader2 } from "lucide-react";
import { useGetCatalogStatsQuery } from "@/features/reports/reportsApi";
import type { CatalogStatOption } from "@/features/reports/reportsApi.types";
import {
  displayStatLabel,
  resolveSectionStats,
  statsEqualDefault,
  type ReportSection,
} from "./reportSchema.types";
import styles from "./StatsChipSelector.module.css";

/**
 * Chip toggles for selecting which stats a chart-backed section displays.
 * Ported from the Vite app's `components/ReportBuilder/
 * StatsChipSelector.tsx`.
 *
 * Deviation from source: the Vite version fetched `getCatalogStats()` in a
 * `useEffect` with its own loading state and a hardcoded `FALLBACK_STATS`
 * catch. Here `useGetCatalogStatsQuery` (RTK Query) is used directly and
 * the fallback list covers both the loading gap and a failed/empty
 * response -- no effect needed at all.
 */

const FALLBACK_STATS: CatalogStatOption[] = [
  { id: "mean", label: "Mean" },
  { id: "min", label: "Min" },
  { id: "max", label: "Max" },
  { id: "p95", label: "P95" },
  { id: "latest", label: "Latest" },
];

export interface StatsChipSelectorProps {
  section: ReportSection;
  onChange: (stats: string[] | undefined) => void;
}

export default function StatsChipSelector({ section, onChange }: StatsChipSelectorProps) {
  const { data, isLoading } = useGetCatalogStatsQuery();
  const selected = resolveSectionStats(section);
  const displayOptions = data?.stats && data.stats.length > 0 ? data.stats : FALLBACK_STATS;

  if (isLoading) {
    return (
      <div className={styles.catalogLoading}>
        <Loader2 className={styles.spinner} size={12} />
      </div>
    );
  }

  function handleToggle(id: string) {
    const isSelected = selected.includes(id);
    if (isSelected && selected.length <= 1) {
      return;
    }
    const next = isSelected ? selected.filter((s) => s !== id) : [...selected, id];
    const ordered = displayOptions.map((o) => o.id).filter((oid) => next.includes(oid));
    onChange(statsEqualDefault(ordered) ? undefined : ordered);
  }

  return (
    <div
      className={styles.statChipRow}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a <fieldset> would add a visible border/legend that doesn't fit this chip row
      role="group"
      aria-label="Statistics"
    >
      {displayOptions.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            className={active ? styles.statChipActive : styles.statChip}
            aria-pressed={active}
            onClick={() => handleToggle(opt.id)}
          >
            {displayStatLabel(opt.id, opt.label)}
          </button>
        );
      })}
    </div>
  );
}
