"use client";

/**
 * Shared chart/table card renderer reused by line_chart/data_table/metric_grid
 * sections. Ported from the Vite app's
 * `components/ReportBuilder/sections/FigureCard.tsx`. Marked "use client":
 * the editable toolbar attaches real onClick/onChange handlers (drag handle,
 * title input, remove button, remove-stat via KpiStrip).
 */

import { GripVertical, LineChart, Table2, X, BarChart3 } from "lucide-react";
import type { SectionPreview } from "@/features/reports/reportsApi.types";
import { KpiStrip } from "./KpiStrip";
import { SectionInsight } from "./SectionInsight";
import type { SectionDragHandleProps } from "./registry";
import { resolveSectionStats, statsEqualDefault, type ReportSection } from "../reportSchema.types";
import styles from "./FigureCard.module.css";

interface FigureCardProps {
  section: ReportSection;
  preview?: SectionPreview;
  previewLoading?: boolean;
  isSelected?: boolean;
  canvasEditable?: boolean;
  dragHandleProps?: SectionDragHandleProps;
  onUpdateSection?: (updates: Partial<ReportSection>) => void;
  onRemoveSection?: () => void;
}

export function FigureCard({
  section,
  preview,
  previewLoading = false,
  isSelected = false,
  canvasEditable = false,
  dragHandleProps,
  onUpdateSection,
  onRemoveSection,
}: FigureCardProps) {
  const chartType =
    preview?.chart_type || section.chart_type || (section.config?.chart_type as string) || "auto";
  const title = section.title || preview?.title || "Untitled section";
  const tableName = preview?.table_name;
  const showChrome = canvasEditable;

  const chartIcon = (() => {
    const type = chartType.toLowerCase();
    if (type.includes("table") || section.type === "data_table") {
      return <Table2 size={14} />;
    }
    if (type.includes("bar") || section.type === "metric_grid") {
      return <BarChart3 size={14} />;
    }
    return <LineChart size={14} />;
  })();

  const handleRemoveStat = (statId: string) => {
    if (!onUpdateSection) {
      return;
    }
    const current = resolveSectionStats(section);
    if (current.length <= 1) {
      return;
    }
    const next = current.filter((id) => id !== statId);
    onUpdateSection({ stats: statsEqualDefault(next) ? undefined : next });
  };

  return (
    <div className={`${styles.figureCard} ${isSelected ? styles.figureCardSelected : ""}`}>
      <div className={styles.figureHead}>
        <span className={styles.figureTypeIcon} aria-hidden>
          {chartIcon}
        </span>
        {showChrome ? (
          <div className={styles.figureCardToolbar}>
            {dragHandleProps ? (
              <button
                type="button"
                className={styles.figureDragHandle}
                {...dragHandleProps.attributes}
                {...dragHandleProps.listeners}
                onClick={(e) => e.stopPropagation()}
                aria-label="Drag to reorder section"
                title="Drag to reorder"
              >
                <GripVertical size={14} />
              </button>
            ) : null}
            <input
              type="text"
              className={styles.figureTitleInput}
              value={title}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onUpdateSection?.({ title: e.target.value })}
              aria-label="Section title"
            />
            {onRemoveSection ? (
              <button
                type="button"
                className={styles.figureRemoveBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveSection();
                }}
                aria-label="Remove section"
                title="Remove section"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ) : (
          <h3 className={styles.figureTitle}>{title}</h3>
        )}
      </div>
      {tableName && (
        <div className={styles.sourceMeta}>
          <span className={styles.metaChip}>{tableName}</span>
        </div>
      )}
      <div className={styles.figurePair}>
        {previewLoading ? (
          <div className={styles.chartSkeleton} aria-hidden>
            <div className={styles.chartSkeletonBar} />
            <div className={styles.chartSkeletonBar} />
            <div className={styles.chartSkeletonBar} />
          </div>
        ) : preview?.chart_svg ? (
          <div
            className={styles.chartBlock}
            dangerouslySetInnerHTML={{ __html: preview.chart_svg }}
          />
        ) : (
          <div className={styles.chartPlaceholder}>Chart preview ({chartType})</div>
        )}
        <div className={styles.figureTail}>
          <KpiStrip
            section={section}
            stats={preview?.stats}
            editable={showChrome}
            onRemoveStat={handleRemoveStat}
          />
          <SectionInsight
            narrative={preview?.stats?.narrative}
            insight={preview?.insight}
            showPlaceholderWhenEmpty
          />
        </div>
      </div>
    </div>
  );
}
