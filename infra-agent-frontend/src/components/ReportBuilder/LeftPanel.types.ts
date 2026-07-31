import type { ReportSchema, ReportSection } from "./reportSchema.types";

/**
 * Left sidebar mode toggle. Ported from the Vite app's `LeftPanel.tsx`.
 */
export type LeftPanelMode = "components" | "templates";

export interface LeftPanelProps {
  mode: LeftPanelMode;
  onModeChange: (mode: LeftPanelMode) => void;
  /** True when the currently-loaded schema is a locked builtin template. */
  locked?: boolean;
  activeTemplateId?: string;
  /**
   * Deviation from the Vite source: receives a ready-to-use `ReportSection`
   * (via `createSectionFromApiComponent`) instead of the raw `ApiComponent` —
   * see `ComponentsList.tsx`'s doc comment for why.
   */
  onAddComponent: (section: ReportSection) => void;
  onLoadTemplate: (schema: ReportSchema) => void;
  onGenerateDirect?: (templateId: string, title?: string) => void;
  generating?: boolean;
  onCreateCustom: () => void;
}
