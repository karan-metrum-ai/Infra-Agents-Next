import type { SectionPreview } from "@/features/reports/reportsApi.types";
import type { ReportSchema, ReportSection } from "./reportSchema.types";

/**
 * Prop contract for `ReportCanvas`, the dnd-kit sortable list rendering a
 * report's section stack via the section-type registry. Mirrors the real
 * call site in the Vite app's `CenterPanel.tsx` (the actual orchestrator
 * that renders `ReportCanvas` — NOT `ReportBuilder.tsx`, which never
 * references it directly).
 *
 * `onSelectCover` is preserved even though this component's body never
 * calls it — that's faithful to the Vite source, where the prop is
 * likewise declared and passed by `CenterPanel.tsx` but never destructured
 * or used inside `ReportCanvas.tsx` itself (cover selection is instead
 * driven entirely by `ReportBuilder.tsx`'s own `selectionKind` state and
 * `PropertiesPanel`). Kept for call-site parity so the future integrator
 * doesn't have to special-case dropping a prop they're already passing.
 */
export interface ReportCanvasProps {
  schema: ReportSchema;
  sectionPreviews?: Record<string, SectionPreview>;
  sectionPreviewsLoading?: boolean;
  buildingSectionId?: string | null;
  selectedSectionId: string | null;
  onSelectCover: () => void;
  onSelectSection: (id: string) => void;
  onSelectTheme: () => void;
  onReorder: (sections: ReportSection[]) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onUpdateSection: (id: string, updates: Partial<ReportSection>) => void;
  hideToolbar?: boolean;
  hideSectionToolbar?: boolean;
  locked?: boolean;
}
