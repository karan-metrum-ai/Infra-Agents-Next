/**
 * Report Agent Template API domain types.
 *
 * Ported from the Vite app's `lib/reportApi.ts` (types only — endpoints
 * live in `reportsApi.ts`) plus `lib/reportSseParser.ts`'s stream event
 * union (re-exported here so every Report Builder file has one canonical
 * type home, matching `sandboxApi.types.ts`'s convention). Never redeclare
 * these elsewhere.
 */

export interface ApiSection {
  id: string;
  title: string;
  data_hint: string[];
  chart_type: string;
  time_range?: string;
  metric_id?: string;
  stats?: string[];
}

export interface CatalogCategory {
  id: string;
  label: string;
  count: number;
}

export interface CatalogMetric {
  id: string;
  label: string;
  table: string;
  unit: string | null;
  chart: string;
}

export interface CatalogStatOption {
  id: string;
  label: string;
}

export interface CatalogStatsResponse {
  stats: CatalogStatOption[];
  default: string[];
}

export interface ApiTemplate {
  template_id: string;
  version: string;
  source: "builtin" | "custom";
  section_count: number;
  sections: ApiSection[];
  /**
   * `generate_only` templates render via a bespoke pipeline — the UI shows
   * a direct one-click Generate (no editor/preview/edit). `title` is the
   * display label.
   */
  generate_only?: boolean;
  title?: string;
}

export interface PreviewCover {
  eyebrow?: string;
  report_title?: string;
  report_subtitle?: string;
  accent_1?: string;
  accent_2?: string;
  accent_3?: string;
}

export interface PreviewDraft {
  template_id?: string;
  sections?: ApiSection[];
  cover?: PreviewCover;
}

export interface PreviewResponse {
  html: string;
}

export interface PublishResponse {
  template_id: string;
  version: string;
  source: string;
  section_count: number;
  sections: ApiSection[];
}

export interface ApiComponent {
  type: string;
  label: string;
  description: string;
  default_title: string;
  chart_type: string | null;
}

export interface RecentReport {
  report_id: string;
  title?: string;
  template_id?: string;
  uploaded_at?: string;
  size_bytes?: number;
  pdf_url?: string;
}

export interface ListReportsResponse {
  reports: RecentReport[];
  count: number;
}

export interface DataAvailability {
  earliest: string | null;
  latest: string | null;
  tables_probed: number;
  tables_with_data: number;
}

export interface SectionPreviewStats {
  mean: number;
  min: number;
  max: number;
  p95: number;
  last: number;
  delta_pct?: number;
  trend?: string;
  unit?: string;
  narrative?: string;
}

export interface SectionPreviewAnomaly {
  device?: string;
  severity?: string;
  detail?: string;
}

export interface SectionPreviewInsight {
  anomalies?: SectionPreviewAnomaly[];
  callout?: string | null;
}

export interface SectionPreview {
  id: string;
  title: string;
  chart_type: string;
  chart_svg: string;
  table_name?: string;
  stats: SectionPreviewStats;
  insight?: SectionPreviewInsight;
}

export interface GenerateReportRequest {
  template_id: string;
  start: string;
  end: string;
  timezone?: string;
}

export interface GenerateReportResponse {
  report_id: string;
  status: string;
  pdf_url: string;
  section_count?: number;
  total_rows?: number;
}

export interface SaveTemplateFromBuilderRequest {
  template_id: string;
  sections: Array<{
    id: string;
    title: string;
    data_hint: string[];
    chart_type: string;
    stats?: string[];
  }>;
}

/* ──────────────────────────────────────────────────────────────────── */
/*  SSE stream event union (from the Vite app's lib/reportSseParser.ts) */
/* ──────────────────────────────────────────────────────────────────── */

export interface GenerateStepPayload {
  step: number;
  total: number;
  label: string;
  key?: string;
}

export interface GenerateChartProgressPayload {
  step: number;
  index: number;
  total: number;
  section_id: string;
  title: string;
}

export interface GenerateErrorPayload {
  message: string;
  step?: number | null;
  key?: string;
  label?: string;
  status_code?: number;
}

export type GenerateStreamEvent =
  | { type: "step_started"; data: GenerateStepPayload }
  | { type: "step_completed"; data: GenerateStepPayload }
  | { type: "chart_progress"; data: GenerateChartProgressPayload }
  | { type: "done"; data: Record<string, unknown> }
  | { type: "error"; data: GenerateErrorPayload };
