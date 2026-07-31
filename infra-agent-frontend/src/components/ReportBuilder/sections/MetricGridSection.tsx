/**
 * Metric-grid section — delegates entirely to FigureCard. Ported from the
 * Vite app's `components/ReportBuilder/sections/MetricGridSection.tsx`. No
 * own styling (matches source: no CSS import there either).
 */

import type { SectionRenderProps } from "./registry";
import { FigureCard } from "./FigureCard";

export default function MetricGridSection(props: SectionRenderProps) {
  return <FigureCard {...props} />;
}
