import type { ComponentType } from "react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { SectionPreview } from "@/features/reports/reportsApi.types";
import type { ReportCover, ReportSection, ReportTheme } from "../reportSchema.types";
import CoverSection from "./CoverSection";
import SummarySection from "./SummarySection";
import MetricGridSection from "./MetricGridSection";
import LineChartSection from "./LineChartSection";
import DataTableSection from "./DataTableSection";
import RichTextSection from "./RichTextSection";
import ImageSection from "./ImageSection";
import CustomSection from "./CustomSection";

/**
 * Section-type registry: a runtime `type -> component` map, decoupling
 * `ReportCanvas` from a hardcoded switch statement. Ported from the Vite
 * app's `sections/registry.ts` (the map/`registerSection`/
 * `getSectionComponent` trio) MERGED with `sections/index.ts` (which was a
 * separate barrel file whose only job was importing every concrete section
 * component and calling `registerSection` once at module load) — this repo
 * bans `index.ts` barrel files, so registration now happens directly here,
 * in the one file that already owns the registry. Any caller that needs
 * registration to have run just imports `getSectionComponent` from this
 * module (ES modules run top-level code once, on first import).
 */

export interface SectionDragHandleProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
}

export interface SectionRenderProps {
  section: ReportSection;
  theme: ReportTheme;
  cover?: ReportCover;
  isSelected?: boolean;
  preview?: SectionPreview;
  previewLoading?: boolean;
  canvasEditable?: boolean;
  dragHandleProps?: SectionDragHandleProps;
  onUpdateSection?: (updates: Partial<ReportSection>) => void;
  onRemoveSection?: () => void;
}

export type SectionComponent = ComponentType<SectionRenderProps>;

const SECTION_REGISTRY: Record<string, SectionComponent> = {};

function registerSection(type: string, component: SectionComponent): void {
  SECTION_REGISTRY[type] = component;
}

export function getSectionComponent(type: string): SectionComponent | undefined {
  return SECTION_REGISTRY[type];
}

registerSection("cover", CoverSection);
registerSection("summary", SummarySection);
registerSection("metric_grid", MetricGridSection);
registerSection("line_chart", LineChartSection);
registerSection("data_table", DataTableSection);
registerSection("rich_text", RichTextSection);
registerSection("image", ImageSection);
registerSection("custom", CustomSection);
