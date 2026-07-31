"use client";

import {
  AlertCircle,
  FileText,
  Grid3x3,
  Image as ImageIcon,
  LineChart,
  PenLine,
  Puzzle,
  Table,
} from "lucide-react";
import type { ReactNode } from "react";

import { Spinner } from "@/components/ui/Spinner/Spinner";
import { useListComponentsQuery } from "@/features/reports/reportsApi";
import type { ApiComponent } from "@/features/reports/reportsApi.types";

import {
  BLOCK_DEFINITIONS,
  createSectionFromApiComponent,
  type ReportSection,
} from "./reportSchema.types";
import styles from "./ComponentsList.module.css";

const ICONS: Record<string, ReactNode> = {
  summary: <FileText size={16} />,
  metric_grid: <Grid3x3 size={16} />,
  line_chart: <LineChart size={16} />,
  data_table: <Table size={16} />,
  rich_text: <PenLine size={16} />,
  image: <ImageIcon size={16} />,
  custom: <Puzzle size={16} />,
};

/** Local fallback when `/components` is unreachable — mirrors the block palette. */
const FALLBACK_COMPONENTS: ApiComponent[] = BLOCK_DEFINITIONS.map((b) => ({
  type: b.type,
  label: b.label,
  description: b.description,
  default_title: b.defaultTitle,
  chart_type: null,
}));

interface ComponentsListProps {
  /**
   * Deviation from the Vite source (which forwarded the raw `ApiComponent`):
   * converts to a `ReportSection` here via `createSectionFromApiComponent`
   * before calling back, so the future ReportBuilder orchestrator can push
   * the result straight onto the schema without repeating the conversion.
   */
  onAddComponent: (section: ReportSection) => void;
}

export function ComponentsList({ onAddComponent }: ComponentsListProps) {
  const { data, isLoading, error, refetch } = useListComponentsQuery();
  const components = error ? FALLBACK_COMPONENTS : (data?.components ?? []);

  if (isLoading) {
    return (
      <div className={styles.panelLoading}>
        <Spinner />
        <span>Loading components...</span>
      </div>
    );
  }

  return (
    <>
      <p className={styles.panelHint}>Click a component to add it to the report editor.</p>
      {error && (
        <output className={styles.panelWarning}>
          <AlertCircle size={14} className={styles.panelWarningIcon} aria-hidden />
          <span>Using local component list (backend unavailable)</span>
          <button type="button" className={styles.retryBtn} onClick={() => refetch()}>
            Retry
          </button>
        </output>
      )}
      <div className={styles.blockList}>
        {components.map((comp) => (
          <button
            key={comp.type}
            type="button"
            className={styles.blockItem}
            aria-label={comp.label}
            onClick={() => onAddComponent(createSectionFromApiComponent(comp))}
          >
            <span className={styles.blockIconWrap}>
              <span className={styles.blockIcon}>{ICONS[comp.type] || <Puzzle size={16} />}</span>
            </span>
            <span className={styles.blockInfo}>
              <span className={styles.blockLabel}>{comp.label}</span>
              <span className={styles.blockDesc}>{comp.description}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

export default ComponentsList;
