import type { SectionPreview } from "@/features/reports/reportsApi.types";
import type { PropertiesSelection } from "./PropertiesPanel";
import type { ReportCover, ReportSchema, ReportSection, ReportTheme } from "./reportSchema.types";

/**
 * Prop contract for `CenterPanel`, the Report Builder's middle-panel chrome
 * (editor/preview tab switch, dark/light toggle, undo/redo/save/lock
 * actions) hosting `ReportCanvas`, `PropertiesPanel`, and `JinjaPreview`.
 * Ported from the Vite app's `components/ReportBuilder/CenterPanel.tsx`.
 * Split into its own file (rather than inline in `CenterPanel.tsx`) because
 * the top-level `ReportBuilder.tsx` orchestrator (built separately) needs
 * `CenterPanelMode` and `CenterPanelProps` to type the state/callbacks it
 * owns and passes down.
 */
export type CenterPanelMode = "editor" | "preview";

export interface CenterPanelProps {
  mode: CenterPanelMode;
  onModeChange: (mode: CenterPanelMode) => void;
  lightMode: boolean;
  onToggleUiTheme: () => void;
  locked?: boolean;
  sectionPreviews?: Record<string, SectionPreview>;
  sectionPreviewsLoading?: boolean;
  schema: ReportSchema;
  selectedSectionId: string | null;
  selection: PropertiesSelection;
  previewHtml: string | null;
  previewPdfUrl?: string | null;
  previewReportTitle?: string | null;
  pdfReloadKey?: number;
  previewLoading: boolean;
  previewError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  autoSaveLabel: string | null;
  dateStart: string;
  dateEnd: string;
  dateMin?: string;
  dateMax?: string;
  dateAvailabilityLoading?: boolean;
  dateAvailIsEstimate?: boolean;
  generating: boolean;
  canGenerate: boolean;
  hasUnsavedChanges?: boolean;
  saving?: boolean;
  buildingSectionId?: string | null;
  onDateStartChange: (value: string) => void;
  onDateEndChange: (value: string) => void;
  onGenerateReport: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRefreshPreview: () => void;
  onSelectCover: () => void;
  onSelectSection: (id: string) => void;
  onSelectTheme: () => void;
  onReorder: (sections: ReportSection[]) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onUpdateCover: (cover: Partial<ReportCover>) => void;
  onUpdateTheme: (theme: Partial<ReportTheme>) => void;
  onUpdateSection: (id: string, updates: Partial<ReportSection>) => void;
}
