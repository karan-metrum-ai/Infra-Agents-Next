"use client";

import { Loader2, Lock, Moon, Redo2, RefreshCw, Save, Sun, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button/Button";
import { Spinner } from "@/components/ui/Spinner/Spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs/Tabs";
import { cn } from "@/lib/utils";
import JinjaPreview from "./JinjaPreview";
import PropertiesPanel from "./PropertiesPanel";
import ReportCanvas from "./ReportCanvas";
import type { CenterPanelMode, CenterPanelProps } from "./CenterPanel.types";
import styles from "./CenterPanel.module.css";

/**
 * Middle-panel chrome for the Report Builder: editor/preview tab switch,
 * dark/light (paper preview) toggle, date-range picker, undo/redo/save/
 * generate actions, and the host for `ReportCanvas` + `PropertiesPanel`
 * (editor mode) or `JinjaPreview` (preview mode). Ported from the Vite
 * app's `components/ReportBuilder/CenterPanel.tsx`.
 *
 * This component owns no state of its own -- `mode`/`lightMode`/undo-redo
 * history/save/generate state all live in the (separately built)
 * `ReportBuilder.tsx` orchestrator and are passed down as props/callbacks,
 * matching the Vite source exactly.
 */

const formatBoundLabel = (dateStr: string): string => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function CenterPanel({
  mode,
  onModeChange,
  lightMode,
  onToggleUiTheme,
  locked = false,
  sectionPreviews = {},
  sectionPreviewsLoading = false,
  schema,
  selectedSectionId,
  selection,
  previewHtml,
  previewPdfUrl = null,
  previewReportTitle = null,
  pdfReloadKey = 0,
  previewLoading,
  previewError,
  canUndo,
  canRedo,
  autoSaveLabel,
  dateStart,
  dateEnd,
  dateMin,
  dateMax,
  dateAvailabilityLoading = false,
  dateAvailIsEstimate = false,
  generating,
  canGenerate,
  hasUnsavedChanges = false,
  saving = false,
  buildingSectionId = null,
  onDateStartChange,
  onDateEndChange,
  onGenerateReport,
  onSave,
  onUndo,
  onRedo,
  onRefreshPreview,
  onSelectCover,
  onSelectSection,
  onSelectTheme,
  onReorder,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onUpdateCover,
  onUpdateTheme,
  onUpdateSection,
}: CenterPanelProps) {
  const displayTitle =
    previewReportTitle ||
    schema.cover.title ||
    schema.template_id?.replace(/_/g, " ") ||
    "Untitled Report";

  const isSectionSelected = selection?.kind === "section";

  const dateRangeTitle =
    dateMin && dateMax ? `Data available ${dateMin} to ${dateMax}` : "Loading data range...";

  const availabilityLabel = dateAvailabilityLoading
    ? "Checking data range…"
    : dateMin && dateMax
      ? `Available ${formatBoundLabel(dateMin)} – ${formatBoundLabel(dateMax)}${
          dateAvailIsEstimate ? " (est.)" : ""
        }`
      : null;

  return (
    <main className={cn(styles.centerPanel, lightMode && styles.lightMode)}>
      <div className={styles.centerToolbar}>
        <div className={styles.centerToolbarLeft}>
          <div className={styles.reportIdentity}>
            <span className={styles.reportSubtitle}>Report</span>
            <div className={styles.reportTitleRow}>
              <span className={styles.reportTitle}>{displayTitle}</span>
              {locked && (
                <span className={styles.lockBadge} title="Built-in template">
                  <Lock size={11} />
                  Built-in
                </span>
              )}
            </div>
          </div>

          <div className={styles.dateRangeGroup} title={dateRangeTitle}>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>From</span>
              <input
                type="date"
                className={styles.dateInput}
                value={dateStart}
                min={dateMin}
                max={dateEnd || dateMax}
                onChange={(event) => onDateStartChange(event.target.value)}
                aria-label="Report start date"
              />
            </label>
            <span className={styles.dateSep} aria-hidden="true">
              –
            </span>
            <label className={styles.dateField}>
              <span className={styles.dateFieldLabel}>To</span>
              <input
                type="date"
                className={styles.dateInput}
                value={dateEnd}
                min={dateStart || dateMin}
                max={dateMax}
                onChange={(event) => onDateEndChange(event.target.value)}
                aria-label="Report end date"
              />
            </label>
            {availabilityLabel && (
              <span
                className={cn(
                  styles.dateAvailability,
                  dateAvailabilityLoading && styles.dateAvailabilityLoading,
                )}
              >
                {dateAvailabilityLoading ? <Loader2 size={11} className={styles.spinner} /> : null}
                {availabilityLabel}
              </span>
            )}
          </div>
        </div>

        <div className={styles.centerToggle}>
          <Tabs
            className={styles.centerTabs}
            value={mode}
            onValueChange={(value) => onModeChange(value as CenterPanelMode)}
          >
            <TabsList aria-label="Report view" variant="default" className={styles.centerTabsList}>
              <TabsTrigger value="editor" className={styles.centerTabTrigger}>
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className={styles.centerTabTrigger}>
                Preview
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={styles.centerActions}>
          <Button
            type="button"
            variant="secondary"
            className={cn(styles.generateBtn, hasUnsavedChanges && styles.needsSave)}
            onClick={onGenerateReport}
            disabled={!canGenerate || generating}
            title={
              hasUnsavedChanges
                ? "Save your changes first, then click Generate Report"
                : "Generate report PDF"
            }
          >
            {generating ? <Spinner size="sm" className={styles.spinner} /> : null}
            {generating ? "Generating…" : "Generate"}
          </Button>

          <div className={styles.toolbarDivider} aria-hidden="true" />

          <Button
            type="button"
            variant="ghost"
            onClick={onToggleUiTheme}
            aria-pressed={lightMode}
            aria-label={lightMode ? "Switch to dark mode" : "Switch to light mode"}
            title={lightMode ? "Switch to dark mode" : "Switch to light mode"}
          >
            {lightMode ? <Moon size={14} /> : <Sun size={14} />}
            <span className={styles.toolbarBtnLabel}>{lightMode ? "Dark" : "Light"}</span>
          </Button>

          {mode === "editor" ? (
            <>
              <div className={styles.toolbarGroup}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onUndo}
                  disabled={!canUndo}
                  aria-label="Undo"
                  title="Undo"
                >
                  <Undo2 size={14} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onRedo}
                  disabled={!canRedo}
                  aria-label="Redo"
                  title="Redo"
                >
                  <Redo2 size={14} />
                </Button>
              </div>

              {autoSaveLabel && <span className={styles.autoSaveStatus}>{autoSaveLabel}</span>}

              <Button
                type="button"
                variant="default"
                className={cn(styles.saveBtn, hasUnsavedChanges && styles.savePending)}
                onClick={onSave}
                disabled={saving}
                aria-label={
                  saving
                    ? "Saving report"
                    : hasUnsavedChanges
                      ? "Save report (unsaved changes)"
                      : "Save report"
                }
                title={
                  hasUnsavedChanges ? "Save template changes before generating" : "Save report"
                }
              >
                <Save size={14} />
                {saving ? "Saving…" : hasUnsavedChanges ? "Save*" : "Save"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onRefreshPreview}
              disabled={previewLoading}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {mode === "editor" ? (
        <div className={cn(styles.editorLayout, generating && styles.editorLayoutGenerating)}>
          <ReportCanvas
            schema={schema}
            sectionPreviews={sectionPreviews}
            sectionPreviewsLoading={sectionPreviewsLoading}
            buildingSectionId={buildingSectionId}
            selectedSectionId={selectedSectionId}
            locked={locked}
            onSelectCover={onSelectCover}
            onSelectSection={onSelectSection}
            onSelectTheme={onSelectTheme}
            onReorder={onReorder}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            onToggleVisibility={onToggleVisibility}
            onUpdateSection={onUpdateSection}
            hideToolbar
            hideSectionToolbar
          />
          {selection && (
            <div
              className={cn(
                styles.editorProperties,
                isSectionSelected && styles.editorPropertiesAttached,
              )}
            >
              <PropertiesPanel
                schema={schema}
                selection={selection}
                locked={locked}
                onSelectTheme={onSelectTheme}
                onUpdateCover={onUpdateCover}
                onUpdateTheme={onUpdateTheme}
                onUpdateSection={onUpdateSection}
                compact
              />
            </div>
          )}
        </div>
      ) : (
        <JinjaPreview
          html={previewHtml}
          pdfUrl={previewPdfUrl}
          pdfReloadKey={pdfReloadKey}
          reportTitle={previewReportTitle}
          loading={previewLoading}
          error={previewError}
          onRefresh={onRefreshPreview}
        />
      )}
    </main>
  );
}
