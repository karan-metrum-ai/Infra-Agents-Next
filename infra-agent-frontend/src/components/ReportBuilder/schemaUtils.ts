import type { PreviewDraft } from "@/features/reports/reportsApi.types";
import { statsEqualDefault, type ReportSchema, type ReportSection } from "./reportSchema.types";

/**
 * Pure conversion helpers between API template payloads and the internal
 * `ReportSchema`/save-payload/preview-draft/fingerprint shapes. Ported
 * verbatim from the Vite app's `components/ReportBuilder/schemaUtils.ts`.
 */

const EXPORTABLE_TYPES = new Set(["metric_grid", "line_chart", "data_table"]);

function mapChartType(section: ReportSection): string {
  if (section.chart_type) return section.chart_type;
  switch (section.type) {
    case "line_chart":
      return (section.config?.chart_type as string) || "line";
    case "data_table":
      return "table";
    case "metric_grid":
      return "auto";
    default:
      return "auto";
  }
}

/** Converts schema sections for backend template save (generate-ready). */
export function schemaToSavePayload(schema: ReportSchema): {
  template_id: string;
  sections: Array<{
    id: string;
    title: string;
    data_hint: string[];
    chart_type: string;
    stats?: string[];
  }>;
} {
  const sections = schema.sections
    .filter((s) => s.visible)
    .map((s) => ({
      id: s.id,
      title: s.title,
      data_hint: s.data_hint || [],
      chart_type: mapChartType(s),
      stats: statsEqualDefault(s.stats) ? undefined : s.stats,
    }));
  return { template_id: schema.template_id, sections };
}

/** Converts schema to backend PreviewDraft for Jinja validation. */
export function schemaToPreviewDraft(schema: ReportSchema): PreviewDraft {
  const exportSections = schema.sections
    .filter((s) => s.visible && EXPORTABLE_TYPES.has(s.type))
    .map((s) => ({
      id: s.id,
      title: s.title,
      data_hint: s.data_hint || [],
      chart_type: mapChartType(s),
      metric_id: s.metric_id,
      stats: statsEqualDefault(s.stats) ? undefined : s.stats,
    }));

  return {
    template_id: schema.template_id || "custom_preview",
    cover: {
      eyebrow: schema.cover.eyebrow,
      report_title: schema.cover.title,
      report_subtitle: schema.cover.subtitle,
      accent_1: schema.cover.accent_1 || schema.theme.primary,
      accent_2: schema.cover.accent_2 || schema.theme.secondary,
      accent_3: schema.cover.accent_3 || "#8b5cf6",
    },
    sections: exportSections,
  };
}

export const DEFAULT_TEMPLATE_ID = "infra_usage_report";
const LAST_TEMPLATE_ID = "custom_infra_usage_report";

/** Templates shown in the picker but not selectable yet. */
export const DISABLED_TEMPLATE_IDS = new Set<string>(["datacenter_health", LAST_TEMPLATE_ID]);

export function isTemplateDisabled(templateId: string): boolean {
  return DISABLED_TEMPLATE_IDS.has(templateId);
}

const TEMPLATE_COVER: Record<string, { title: string; subtitle: string }> = {
  infra_usage_report: {
    title: "Infrastructure Usage & Capacity Report",
    subtitle: "Telemetry summary for the selected period",
  },
};

const REPORT_DISPLAY_TITLES: Record<string, string> = {
  gpu_performance: "GPU Performance Report",
  infra_usage_report: "Infrastructure Usage & Capacity Report",
  custom_infra_usage_report: "Infrastructure Usage & Capacity Report",
  datacenter_health: "Datacenter Health Report",
  power_analysis: "Power Analysis Report",
};

const DEFAULT_REPORT_TITLE = "Infrastructure Report";

export function formatTemplateLabel(templateId: string): string {
  const labels: Record<string, string> = {
    infra_usage_report: "Infra Usage Report",
  };
  if (labels[templateId]) return labels[templateId];
  return templateId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Display title for a generated report (matches PDF cover title). */
export function resolveReportDisplayTitle(report: {
  title?: string;
  template_id?: string;
  report_id?: string;
}): string {
  if (report.title && report.title !== DEFAULT_REPORT_TITLE) {
    return report.title;
  }
  if (report.template_id && REPORT_DISPLAY_TITLES[report.template_id]) {
    return REPORT_DISPLAY_TITLES[report.template_id];
  }
  if (report.template_id) {
    return formatTemplateLabel(report.template_id);
  }
  return report.title || report.report_id || DEFAULT_REPORT_TITLE;
}

/** Puts infra_usage_report first, custom_infra_usage_report last. */
export function sortTemplates<T extends { template_id: string }>(templates: T[]): T[] {
  return [...templates].sort((a, b) => {
    if (a.template_id === DEFAULT_TEMPLATE_ID) return -1;
    if (b.template_id === DEFAULT_TEMPLATE_ID) return 1;
    if (a.template_id === LAST_TEMPLATE_ID) return 1;
    if (b.template_id === LAST_TEMPLATE_ID) return -1;
    return a.template_id.localeCompare(b.template_id);
  });
}

/** Maps an API template into a ReportSchema for the builder. */
export function templateToSchema(
  template: {
    template_id: string;
    version: string;
    source?: "builtin" | "custom";
    sections: Array<{
      id: string;
      title: string;
      data_hint: string[];
      chart_type: string;
      metric_id?: string;
      stats?: string[];
    }>;
  },
  theme?: ReportSchema["theme"],
): ReportSchema {
  return {
    template_id: template.template_id,
    version: template.version,
    source: template.source ?? "builtin",
    theme: theme || {
      primary: "#0057ff",
      secondary: "#222222",
      font: "Inter",
      spacing: "comfortable",
    },
    cover: {
      eyebrow: "Infrastructure Intelligence",
      title:
        TEMPLATE_COVER[template.template_id]?.title ?? formatTemplateLabel(template.template_id),
      subtitle: TEMPLATE_COVER[template.template_id]?.subtitle ?? "Generated from template",
    },
    sections: template.sections.map((s) => ({
      id: s.id,
      type: chartTypeToSectionType(s.chart_type),
      title: s.title,
      visible: true,
      data_hint: s.data_hint,
      chart_type: s.chart_type,
      metric_id: s.metric_id,
      stats: s.stats,
    })),
  };
}

/** Stable snapshot for save vs dirty detection (excludes dates). */
export function schemaSaveFingerprint(schema: ReportSchema): string {
  return JSON.stringify({
    template_id: schema.template_id,
    version: schema.version,
    source: schema.source,
    cover: schema.cover,
    sections: schema.sections.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      visible: s.visible,
      stats: s.stats,
      chart_type: s.chart_type,
      data_hint: s.data_hint,
      metric_id: s.metric_id,
    })),
  });
}

function chartTypeToSectionType(chartType: string): ReportSchema["sections"][0]["type"] {
  if (chartType === "table") return "data_table";
  if (["line", "area", "bar", "stacked_bar"].includes(chartType)) {
    return "line_chart";
  }
  return "metric_grid";
}
