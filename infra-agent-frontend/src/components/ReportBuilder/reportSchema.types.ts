/**
 * Report schema types — shared contract for the React preview canvas and
 * the backend's Jinja export. Ported from the Vite app's
 * `components/ReportBuilder/types.ts`. `ApiComponent` is imported from
 * `@/features/reports/reportsApi.types` (the canonical Report Builder API
 * type home) rather than redeclared.
 */

import type { ApiComponent } from "@/features/reports/reportsApi.types";

export type SectionType =
  | "summary"
  | "metric_grid"
  | "line_chart"
  | "data_table"
  | "rich_text"
  | "image"
  | "custom";

export type ThemeSpacing = "compact" | "comfortable" | "spacious";

export interface ReportTheme {
  primary: string;
  secondary: string;
  font: string;
  spacing: ThemeSpacing;
}

export interface ReportCover {
  eyebrow: string;
  title: string;
  subtitle: string;
  accent_1?: string;
  accent_2?: string;
  accent_3?: string;
}

export interface ReportSection {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
  data_hint?: string[];
  metric_id?: string;
  stats?: string[];
  chart_type?: string;
  config?: Record<string, unknown>;
}

export const DEFAULT_SECTION_STATS = ["mean", "min", "max", "p95", "latest"] as const;

export function resolveSectionStats(section: ReportSection): string[] {
  return section.stats ?? [...DEFAULT_SECTION_STATS];
}

export function displayStatLabel(id: string, apiLabel: string): string {
  if (id === "mean") return "AVG";
  return apiLabel;
}

export function statsEqualDefault(stats: string[] | undefined): boolean {
  if (!stats || stats.length !== DEFAULT_SECTION_STATS.length) {
    return !stats;
  }
  return DEFAULT_SECTION_STATS.every((id) => stats.includes(id));
}

export interface ReportSchema {
  template_id: string;
  version: string;
  theme: ReportTheme;
  cover: ReportCover;
  sections: ReportSection[];
  /**
   * Origin of the schema. Built-in templates are locked to limited edits
   * (reorder / remove sections, and add / remove statistics chips); custom
   * schemas are fully editable.
   */
  source?: "builtin" | "custom";
}

export interface BlockDefinition {
  type: SectionType;
  label: string;
  description: string;
  defaultTitle: string;
  defaultConfig?: Record<string, unknown>;
}

export const DEFAULT_REPORT_SCHEMA: ReportSchema = {
  template_id: "",
  version: "1.0",
  theme: {
    primary: "#0057ff",
    secondary: "#222222",
    font: "Inter",
    spacing: "comfortable",
  },
  cover: {
    eyebrow: "Infrastructure Intelligence",
    title: "Infrastructure Report",
    subtitle: "Telemetry summary for the selected period",
    accent_1: "#22d3ee",
    accent_2: "#6366f1",
    accent_3: "#8b5cf6",
  },
  sections: [],
  source: "custom",
};

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "summary",
    label: "Executive Summary",
    description: "High-level narrative overview",
    defaultTitle: "Executive Summary",
  },
  {
    type: "metric_grid",
    label: "Metrics Grid",
    description: "KPI cards in a responsive grid",
    defaultTitle: "Key Metrics",
    defaultConfig: { columns: 3 },
  },
  {
    type: "line_chart",
    label: "Trend Chart",
    description: "Time-series line or area chart",
    defaultTitle: "Trend Analysis",
    defaultConfig: { chart_type: "line" },
  },
  {
    type: "data_table",
    label: "Data Table",
    description: "Tabular metric breakdown",
    defaultTitle: "Data Table",
    defaultConfig: { chart_type: "table" },
  },
  {
    type: "rich_text",
    label: "Rich Text",
    description: "Formatted text content block",
    defaultTitle: "Notes",
    defaultConfig: { content: "Enter your content here..." },
  },
  {
    type: "image",
    label: "Image",
    description: "Image or diagram placeholder",
    defaultTitle: "Image",
    defaultConfig: { alt: "Report image" },
  },
  {
    type: "custom",
    label: "Custom Section",
    description: "Flexible custom content block",
    defaultTitle: "Custom Section",
  },
];

export function createSectionId(type: SectionType): string {
  return `${type}_${Date.now().toString(36)}`;
}

export function createSectionFromBlock(block: BlockDefinition): ReportSection {
  return {
    id: createSectionId(block.type),
    type: block.type,
    title: block.defaultTitle,
    visible: true,
    data_hint: [],
    chart_type:
      block.type === "line_chart"
        ? "line"
        : block.type === "data_table"
          ? "table"
          : block.type === "metric_grid"
            ? "auto"
            : undefined,
    config: block.defaultConfig ? { ...block.defaultConfig } : {},
  };
}

export function createSectionFromType(type: string): ReportSection {
  const block = BLOCK_DEFINITIONS.find((b) => b.type === type);
  if (!block) {
    return {
      id: createSectionId("custom"),
      type: "custom",
      title: "Custom Section",
      visible: true,
      config: {},
    };
  }
  return createSectionFromBlock(block);
}

export function createSectionFromApiComponent(component: ApiComponent): ReportSection {
  const block = BLOCK_DEFINITIONS.find((b) => b.type === component.type);
  const base = block ? createSectionFromBlock(block) : createSectionFromType(component.type);
  return {
    ...base,
    title: component.default_title || base.title,
    chart_type:
      component.chart_type ??
      base.chart_type ??
      (component.type === "line_chart"
        ? "line"
        : component.type === "data_table"
          ? "table"
          : component.type === "metric_grid"
            ? "auto"
            : undefined),
  };
}
