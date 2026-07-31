import type { SectionType } from "./reportSchema.types";

export const SECTION_TYPE_META: Record<SectionType, { label: string; description: string }> = {
  summary: { label: "Executive Summary", description: "Narrative overview block" },
  metric_grid: { label: "Metrics Grid", description: "KPI stat cards" },
  line_chart: { label: "Trend Chart", description: "Time-series visualization" },
  data_table: { label: "Data Table", description: "Tabular breakdown" },
  rich_text: { label: "Rich Text", description: "Formatted content" },
  image: { label: "Image", description: "Image placeholder" },
  custom: { label: "Custom Section", description: "Flexible block" },
};

export const CHART_TYPE_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "bar", label: "Bar" },
  { id: "multiline", label: "Multi" },
  { id: "table", label: "Table" },
  { id: "hbar", label: "H-Bar" },
  { id: "stacked_bar", label: "Stacked" },
  { id: "donut", label: "Donut" },
  { id: "gauge", label: "Gauge" },
  { id: "heatmap", label: "Heatmap" },
] as const;
