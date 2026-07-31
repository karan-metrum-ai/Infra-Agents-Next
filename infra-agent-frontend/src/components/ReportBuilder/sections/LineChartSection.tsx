/**
 * Trend/line-chart section — delegates entirely to FigureCard. Ported from
 * the Vite app's `components/ReportBuilder/sections/LineChartSection.tsx`.
 * No own styling (matches source: no CSS import there either).
 */

import type { SectionRenderProps } from "./registry";
import { FigureCard } from "./FigureCard";

export default function LineChartSection({
  section,
  preview,
  previewLoading,
  isSelected,
  canvasEditable,
  dragHandleProps,
  onUpdateSection,
  onRemoveSection,
}: SectionRenderProps) {
  return (
    <FigureCard
      section={section}
      preview={preview}
      previewLoading={previewLoading}
      isSelected={isSelected}
      canvasEditable={canvasEditable}
      dragHandleProps={dragHandleProps}
      onUpdateSection={onUpdateSection}
      onRemoveSection={onRemoveSection}
    />
  );
}
