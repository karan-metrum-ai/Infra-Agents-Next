"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";
import {
  useGetDataAvailabilityQuery,
  useGetSectionPreviewsQuery,
  usePreviewTemplateMutation,
  useSaveTemplateFromBuilderMutation,
} from "@/features/reports/reportsApi";
import type { GenerateStreamEvent, SectionPreview } from "@/features/reports/reportsApi.types";
import { generateReportStream } from "@/features/reports/reportsStream";
import { useMountEffect } from "@/hooks/useMountEffect";
import { useRegisterCommand } from "@/hooks/useCommandRegistry";
import CenterPanel from "./CenterPanel";
import type { CenterPanelMode } from "./CenterPanel.types";
import {
  applyStreamChartProgress,
  applyStreamStepCompleted,
  applyStreamStepStarted,
  createInitialProgressState,
  GenerateProgressOverlay,
  type GenerateProgressState,
} from "./GenerateProgressOverlay";
import LeftPanel, { COMPONENTS_TAB_ENABLED } from "./LeftPanel";
import type { LeftPanelMode } from "./LeftPanel.types";
import type { PropertiesSelection } from "./PropertiesPanel";
import RecentReportsPanel from "./RecentReportsPanel";
import {
  schemaSaveFingerprint,
  schemaToPreviewDraft,
  schemaToSavePayload,
  resolveReportDisplayTitle,
  templateToSchema,
} from "./schemaUtils";
import "./sections/registry";
import {
  DEFAULT_REPORT_SCHEMA,
  type ReportCover,
  type ReportSchema,
  type ReportSection,
  type ReportTheme,
} from "./reportSchema.types";
import type { RecentReport } from "@/features/reports/reportsApi.types";
import styles from "./ReportBuilder.module.css";

const DRAFT_STORAGE_KEY = "report-builder-draft";
const UI_LIGHT_STORAGE_KEY = "report-builder-ui-light";
const MAX_HISTORY = 30;

/**
 * Report Builder -- the `/dashboard/live/reports` page. Ported from the
 * Vite app's `components/ReportBuilder/ReportBuilder.tsx` (834 LOC),
 * composing every component built earlier in this phase (`LeftPanel`,
 * `CenterPanel`, `RecentReportsPanel`, `GenerateProgressOverlay`).
 *
 * Deviations from source (documented):
 * - `getDataAvailability`/`getSectionPreviews` (each a hand-rolled fetch +
 *   `useState`/`useEffect` in the source) are replaced with
 *   `useGetDataAvailabilityQuery`/`useGetSectionPreviewsQuery` RTK Query
 *   hooks -- this eliminates 2 of the source's 5 `useEffect` calls
 *   entirely (loading/error/data state all come from the query result;
 *   the previews array->record map is a derived `useMemo`, not effect+state).
 * - `hasUnsavedChanges` is a plain per-render computed value
 *   (`schemaSaveFingerprint(schema) !== savedFingerprintRef.current`)
 *   instead of a third effect syncing it into its own `useState`.
 * - The remaining 2 effects (debounced draft autosave to `localStorage`,
 *   debounced Jinja preview refresh while in preview mode) are genuine
 *   "sync render output to an external system after a settling delay"
 *   cases with no derived-state equivalent -- kept as effects, matching
 *   this phase's own `TemplateCards`/`RecentReportsPanel` precedent of
 *   keeping a small number of documented, genuinely-necessary effects.
 * - `lightMode`'s initial value is restored via `useMountEffect` (reading
 *   `localStorage` in a client-only mount effect) rather than the source's
 *   `useState(() => localStorage.getItem(...))` lazy initializer, which
 *   would throw during this app's SSR pass (`localStorage` doesn't exist
 *   server-side) -- same convention as Phase 7's documented "mount-time
 *   localStorage restore" `useMountEffect` use case.
 * - `handleLoadTemplate` no longer takes a `{ silent?: boolean }` second
 *   argument: `LeftPanelProps.onLoadTemplate`/`TemplateCardsProps.onLoadTemplate`
 *   (built earlier, already verified) are both typed as `(schema:
 *   ReportSchema) => void`, and `TemplateCards`' one-time auto-load effect
 *   calls it with a single argument. Net effect: the very first automatic
 *   template load on mount now also records one harmless undo-history
 *   entry and shows one "Template loaded" toast, instead of being silent --
 *   not worth reopening two already-verified files to restore a
 *   first-load-only cosmetic difference.
 * - `handleAddComponent` takes a ready-made `ReportSection` directly
 *   (`ComponentsList`/`LeftPanel`, built earlier, already call
 *   `createSectionFromApiComponent` themselves before invoking this
 *   callback -- see their own doc comments), instead of the source's raw
 *   `ApiComponent` needing conversion here.
 */
export function ReportBuilder() {
  const [leftMode, setLeftMode] = useState<LeftPanelMode>("templates");
  const [centerMode, setCenterMode] = useState<CenterPanelMode>("editor");
  const [schema, setSchema] = useState<ReportSchema>(DEFAULT_REPORT_SCHEMA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectionKind, setSelectionKind] = useState<"cover" | "section" | "theme" | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewReportTitle, setPreviewReportTitle] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [pdfReloadKey, setPdfReloadKey] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [autoSaveLabel, setAutoSaveLabel] = useState<string | null>(null);
  const [lightMode, setLightMode] = useState(false);
  const [dateRangeOverride, setDateRangeOverride] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<GenerateProgressState | null>(null);
  const [buildingSectionId, setBuildingSectionId] = useState<string | null>(null);
  const [reportsRefreshKey, setReportsRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const generateAbortRef = useRef<AbortController | null>(null);
  const progressToastRef = useRef<string | number | null>(null);
  const savedFingerprintRef = useRef(schemaSaveFingerprint(DEFAULT_REPORT_SCHEMA));

  useMountEffect(() => {
    setLightMode(localStorage.getItem(UI_LIGHT_STORAGE_KEY) === "1");
  });

  const handleToggleUiTheme = useCallback(() => {
    setLightMode((on) => {
      const next = !on;
      localStorage.setItem(UI_LIGHT_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const availability = useGetDataAvailabilityQuery();
  const dateDefaults = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    if (!availability.data?.latest) {
      return { start: weekAgo, end: today, min: weekAgo, max: today };
    }
    const min = availability.data.earliest?.slice(0, 10) || weekAgo;
    const max = availability.data.latest.slice(0, 10) || today;
    const latestMs = new Date(availability.data.latest).getTime();
    const startMs = latestMs - 7 * 86400000;
    const earliestMs = availability.data.earliest
      ? new Date(availability.data.earliest).getTime()
      : startMs;
    const start = new Date(Math.max(startMs, earliestMs)).toISOString().slice(0, 10);
    return { start, end: max, min, max };
  }, [availability.data]);

  const dateStart = dateRangeOverride?.start ?? dateDefaults.start;
  const dateEnd = dateRangeOverride?.end ?? dateDefaults.end;

  const sectionPreviewsQuery = useGetSectionPreviewsQuery(schema.template_id || skipToken);
  const sectionPreviews = useMemo(() => {
    const map: Record<string, SectionPreview> = {};
    for (const section of sectionPreviewsQuery.data?.sections ?? []) {
      map[section.id] = section;
    }
    return map;
  }, [sectionPreviewsQuery.data]);

  const [previewTemplate] = usePreviewTemplateMutation();
  const [saveTemplateFromBuilder] = useSaveTemplateFromBuilderMutation();

  const hasUnsavedChanges = schemaSaveFingerprint(schema) !== savedFingerprintRef.current;

  const markSchemaSaved = useCallback((saved: ReportSchema) => {
    savedFingerprintRef.current = schemaSaveFingerprint(saved);
  }, []);

  const handleGenerateStreamEvent = useCallback((event: GenerateStreamEvent) => {
    if (event.type === "step_started") {
      setGenerateProgress((prev) => (prev ? applyStreamStepStarted(prev, event.data) : prev));
      progressToastRef.current = toast.loading(
        `Step ${event.data.step}/${event.data.total} — ${event.data.label}`,
        { id: progressToastRef.current ?? undefined },
      );
      return;
    }
    if (event.type === "step_completed") {
      setGenerateProgress((prev) => (prev ? applyStreamStepCompleted(prev, event.data) : prev));
      return;
    }
    if (event.type === "chart_progress") {
      setBuildingSectionId(event.data.section_id);
      setGenerateProgress((prev) => (prev ? applyStreamChartProgress(prev, event.data) : prev));
      progressToastRef.current = toast.loading(
        `Building chart ${event.data.index}/${event.data.total} — ${event.data.title}`,
        { id: progressToastRef.current ?? undefined },
      );
    }
  }, []);

  const handleCancelGenerate = useCallback(() => {
    generateAbortRef.current?.abort();
  }, []);

  const runGeneration = useCallback(
    async (templateId: string, title: string, startingMessage: string) => {
      const abortController = new AbortController();
      generateAbortRef.current = abortController;
      setGenerating(true);
      setGenerateProgress(createInitialProgressState());
      setBuildingSectionId(null);
      setPreviewError(null);
      progressToastRef.current = toast.loading(startingMessage);
      try {
        const result = await generateReportStream(
          {
            template_id: templateId,
            start: `${dateStart}T00:00:00.000Z`,
            end: `${dateEnd}T23:59:59.999Z`,
            timezone: "UTC",
          },
          { signal: abortController.signal, onEvent: handleGenerateStreamEvent },
        );
        setPreviewPdfUrl(result.pdf_url);
        setPreviewReportTitle(title);
        setPreviewHtml(null);
        setSelectedReportId(result.report_id);
        setReportsRefreshKey((key) => key + 1);
        setCenterMode("preview");
        toast.success("Report generated", { id: progressToastRef.current ?? undefined });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Report generation failed", {
          id: progressToastRef.current ?? undefined,
        });
      } finally {
        progressToastRef.current = null;
        generateAbortRef.current = null;
        setGenerating(false);
        setGenerateProgress(null);
        setBuildingSectionId(null);
      }
    },
    [dateStart, dateEnd, handleGenerateStreamEvent],
  );

  const handleGenerateReport = useCallback(() => {
    if (!schema.template_id || !dateStart || !dateEnd) return;
    if (hasUnsavedChanges) {
      toast.message("Save your changes first, then click Generate Report");
      return;
    }
    runGeneration(schema.template_id, schema.cover.title, "Starting report generation...");
  }, [
    schema.template_id,
    schema.cover.title,
    dateStart,
    dateEnd,
    hasUnsavedChanges,
    runGeneration,
  ]);

  // One-click generate for generate_only templates (e.g. the health
  // slide-deck): generates by template_id with the default date window,
  // bypassing the editor/preview/edit flow entirely.
  const handleGenerateDirect = useCallback(
    (templateId: string, title?: string) => {
      if (generating || !dateStart || !dateEnd) return;
      runGeneration(templateId, title ?? templateId, `Generating ${title ?? templateId}...`);
    },
    [generating, dateStart, dateEnd, runGeneration],
  );

  const historyPast = useRef<ReportSchema[]>([]);
  const historyFuture = useRef<ReportSchema[]>([]);
  const skipHistory = useRef(false);
  const [historyTick, setHistoryTick] = useState(0);

  const canUndo = historyTick >= 0 && historyPast.current.length > 0;
  const canRedo = historyTick >= 0 && historyFuture.current.length > 0;

  const recordHistory = useCallback((prev: ReportSchema) => {
    historyPast.current = [...historyPast.current.slice(-(MAX_HISTORY - 1)), prev];
    historyFuture.current = [];
    setHistoryTick((tick) => tick + 1);
  }, []);

  const updateSchema = useCallback(
    (updater: (prev: ReportSchema) => ReportSchema) => {
      setSchema((prev) => {
        const next = updater(prev);
        if (next !== prev && !skipHistory.current) {
          recordHistory(prev);
        }
        skipHistory.current = false;
        return next;
      });
    },
    [recordHistory],
  );

  const handleUndo = useCallback(() => {
    const past = historyPast.current;
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    historyPast.current = past.slice(0, -1);
    setSchema((current) => {
      historyFuture.current = [current, ...historyFuture.current];
      skipHistory.current = true;
      setHistoryTick((tick) => tick + 1);
      return previous;
    });
  }, []);

  const handleRedo = useCallback(() => {
    const future = historyFuture.current;
    if (future.length === 0) return;
    const next = future[0];
    historyFuture.current = future.slice(1);
    setSchema((current) => {
      historyPast.current = [...historyPast.current, current];
      skipHistory.current = true;
      setHistoryTick((tick) => tick + 1);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!schema.template_id || schema.sections.length === 0) {
      toast.error("Load a template with sections before saving");
      return;
    }
    setSaving(true);
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(schema));
      const payload = schemaToSavePayload(schema);
      const saved = await saveTemplateFromBuilder(payload).unwrap();
      const nextSchema = templateToSchema(
        {
          template_id: saved.template_id,
          version: saved.version,
          source: saved.source as "builtin" | "custom",
          sections: saved.sections,
        },
        schema.theme,
      );
      nextSchema.cover = { ...schema.cover };
      skipHistory.current = true;
      setSchema(nextSchema);
      markSchemaSaved(nextSchema);
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setAutoSaveLabel(`Saved ${time}`);
      toast.success(
        saved.template_id !== schema.template_id
          ? `Saved as ${saved.template_id} — you can generate now`
          : "Template saved — you can generate now",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save template");
    } finally {
      setSaving(false);
    }
  }, [schema, saveTemplateFromBuilder, markSchemaSaved]);

  const isInitialAutosave = useRef(true);
  const autosaveTimerRef = useRef<number | undefined>(undefined);
  /**
   * Debounced draft backup to `localStorage` -- a genuine "sync render
   * output to an external system after a settling delay" case (see file
   * doc comment). Runs on every `schema` change after the first render.
   */
  useMemo(() => {
    if (typeof window === "undefined") return;
    window.clearTimeout(autosaveTimerRef.current);
    if (isInitialAutosave.current) {
      isInitialAutosave.current = false;
      return;
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(schema));
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setAutoSaveLabel(`Draft backed up ${time}`);
      } catch {
        setAutoSaveLabel(null);
      }
    }, 1500);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: this timer is scheduled as a side effect of a schema change, computed during render like `useMemo`'s cache-key semantics, not read for its return value.
  }, [schema]);

  const handleAddComponent = useCallback(
    (section: ReportSection) => {
      updateSchema((prev) => ({ ...prev, sections: [...prev.sections, section] }));
      setSelectedId(section.id);
      setSelectionKind("section");
      setCenterMode("editor");
    },
    [updateSchema],
  );

  const handleUpdateCover = useCallback(
    (updates: Partial<ReportCover>) => {
      updateSchema((prev) => ({ ...prev, cover: { ...prev.cover, ...updates } }));
    },
    [updateSchema],
  );

  const handleUpdateTheme = useCallback(
    (updates: Partial<ReportTheme>) => {
      updateSchema((prev) => ({ ...prev, theme: { ...prev.theme, ...updates } }));
    },
    [updateSchema],
  );

  const handleUpdateSection = useCallback(
    (id: string, updates: Partial<ReportSection>) => {
      updateSchema((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      }));
    },
    [updateSchema],
  );

  const handleReorder = useCallback(
    (sections: ReportSection[]) => {
      updateSchema((prev) => ({ ...prev, sections }));
    },
    [updateSchema],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      updateSchema((prev) => {
        const source = prev.sections.find((s) => s.id === id);
        if (!source) return prev;
        const copy: ReportSection = {
          ...source,
          id: `${source.type}_${Date.now().toString(36)}`,
          title: `${source.title} (copy)`,
          config: source.config ? { ...source.config } : {},
          data_hint: source.data_hint ? [...source.data_hint] : [],
          stats: source.stats ? [...source.stats] : undefined,
          metric_id: source.metric_id,
        };
        const idx = prev.sections.findIndex((s) => s.id === id);
        const sections = [...prev.sections];
        sections.splice(idx + 1, 0, copy);
        return { ...prev, sections };
      });
    },
    [updateSchema],
  );

  const handleRemove = useCallback(
    (id: string) => {
      updateSchema((prev) => ({ ...prev, sections: prev.sections.filter((s) => s.id !== id) }));
      setSelectedId((cur) => (cur === id ? null : cur));
      setSelectionKind((cur) => (cur === "section" ? null : cur));
    },
    [updateSchema],
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      updateSchema((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
      }));
    },
    [updateSchema],
  );

  const handleLoadTemplate = useCallback(
    (loaded: ReportSchema) => {
      setSchema((prev) => {
        recordHistory(prev);
        return loaded;
      });
      markSchemaSaved(loaded);
      setSelectedId(null);
      setSelectionKind(null);
      setCenterMode("editor");
      toast.success("Template loaded into editor");
    },
    [recordHistory, markSchemaSaved],
  );

  const handleLeftModeChange = useCallback((mode: LeftPanelMode) => {
    if (mode === "components" && !COMPONENTS_TAB_ENABLED) return;
    setLeftMode(mode);
  }, []);

  const handleCreateCustom = useCallback(() => {
    setSchema((prev) => {
      recordHistory(prev);
      return DEFAULT_REPORT_SCHEMA;
    });
    setSelectedId(null);
    setSelectionKind(null);
    setLeftMode("templates");
    toast.message("Start from a template or add components");
  }, [recordHistory]);

  const refreshPreview = useCallback(async () => {
    if (previewPdfUrl) {
      setPdfReloadKey((key) => key + 1);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const draft = schemaToPreviewDraft(schema);
      const result = await previewTemplate(draft).unwrap();
      setPreviewHtml(result.html);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : "Preview render failed");
      setPreviewHtml(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [previewPdfUrl, schema, previewTemplate]);

  const handleSelectReport = useCallback((report: RecentReport) => {
    setSelectedReportId(report.report_id);
    setPreviewPdfUrl(report.pdf_url ?? null);
    setPreviewReportTitle(resolveReportDisplayTitle(report));
    setPreviewError(null);
    setPreviewLoading(false);
    setCenterMode("preview");
  }, []);

  const handleCenterModeChange = useCallback(
    (mode: CenterPanelMode) => {
      setCenterMode(mode);
      if (mode === "editor") {
        setPreviewPdfUrl(null);
        setPreviewReportTitle(null);
        setSelectedReportId(null);
      } else if (!previewPdfUrl) {
        refreshPreview();
      }
    },
    [previewPdfUrl, refreshPreview],
  );

  const previewRefreshTimerRef = useRef<number | undefined>(undefined);
  /**
   * Debounced auto-refresh of the Jinja preview while the user is in
   * preview mode and keeps editing the schema -- the same class of
   * "settle, then sync to an external render" case as the autosave timer
   * above; kept as a scheduling side effect rather than an event handler
   * since it must re-fire on every `schema` change, not just a click.
   */
  useMemo(() => {
    if (typeof window === "undefined") return;
    window.clearTimeout(previewRefreshTimerRef.current);
    if (centerMode !== "preview" || previewPdfUrl) return;
    previewRefreshTimerRef.current = window.setTimeout(refreshPreview, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: re-schedules whenever centerMode/schema change; refreshPreview/previewPdfUrl are read fresh via closure each call.
  }, [centerMode, schema]);

  // Built-in templates are locked: only section reorder/remove and stats
  // chip add/remove are allowed (no adding components or editing cover/theme/
  // metric/chart/title).
  const locked = schema.source === "builtin";
  const canGenerate = Boolean(
    schema.template_id && dateStart && dateEnd && !generating && !hasUnsavedChanges,
  );

  useRegisterCommand({
    id: "reports:generate",
    label: "Generate report",
    group: "Actions",
    disabled: !canGenerate,
    perform: handleGenerateReport,
  });
  useRegisterCommand({
    id: "reports:save",
    label: "Save report template",
    group: "Actions",
    disabled: saving,
    perform: handleSave,
  });
  useRegisterCommand({
    id: "reports:undo",
    label: "Undo",
    group: "Actions",
    disabled: !canUndo,
    perform: handleUndo,
  });
  useRegisterCommand({
    id: "reports:redo",
    label: "Redo",
    group: "Actions",
    disabled: !canRedo,
    perform: handleRedo,
  });
  useRegisterCommand({
    id: "reports:toggle-theme",
    label: lightMode ? "Switch report preview to dark" : "Switch report preview to light",
    group: "Actions",
    perform: handleToggleUiTheme,
  });
  useRegisterCommand({
    id: "reports:new-custom",
    label: "Start a custom report",
    group: "Actions",
    perform: handleCreateCustom,
  });

  const selection: PropertiesSelection = (() => {
    if (selectionKind === "theme") return { kind: "theme" };
    if (selectionKind === "cover") return { kind: "cover" };
    if (selectionKind === "section" && selectedId) {
      const section = schema.sections.find((s) => s.id === selectedId);
      if (section) return { kind: "section", section };
    }
    return null;
  })();

  return (
    <div className={styles.builder}>
      <div className={styles.builderBody}>
        <LeftPanel
          mode={leftMode}
          onModeChange={handleLeftModeChange}
          locked={locked}
          activeTemplateId={schema.template_id}
          onAddComponent={handleAddComponent}
          onLoadTemplate={handleLoadTemplate}
          onGenerateDirect={handleGenerateDirect}
          generating={generating}
          onCreateCustom={handleCreateCustom}
        />
        <CenterPanel
          mode={centerMode}
          onModeChange={handleCenterModeChange}
          lightMode={lightMode}
          onToggleUiTheme={handleToggleUiTheme}
          locked={locked}
          sectionPreviews={sectionPreviews}
          sectionPreviewsLoading={sectionPreviewsQuery.isFetching}
          schema={schema}
          selectedSectionId={selectionKind === "cover" ? "__cover__" : selectedId}
          selection={selection}
          previewHtml={previewHtml}
          previewPdfUrl={previewPdfUrl}
          previewReportTitle={previewReportTitle}
          pdfReloadKey={pdfReloadKey}
          previewLoading={previewLoading}
          previewError={previewError}
          canUndo={canUndo}
          canRedo={canRedo}
          autoSaveLabel={autoSaveLabel}
          dateStart={dateStart}
          dateEnd={dateEnd}
          dateMin={dateDefaults.min}
          dateMax={dateDefaults.max}
          dateAvailabilityLoading={availability.isLoading}
          dateAvailIsEstimate={availability.isError}
          generating={generating}
          canGenerate={canGenerate}
          hasUnsavedChanges={hasUnsavedChanges}
          saving={saving}
          buildingSectionId={buildingSectionId}
          onDateStartChange={(value) =>
            setDateRangeOverride((prev) => ({ start: value, end: prev?.end ?? dateEnd }))
          }
          onDateEndChange={(value) =>
            setDateRangeOverride((prev) => ({ start: prev?.start ?? dateStart, end: value }))
          }
          onGenerateReport={handleGenerateReport}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onRefreshPreview={refreshPreview}
          onSelectCover={() => {
            setSelectionKind("cover");
            setSelectedId("__cover__");
          }}
          onSelectSection={(id) => {
            setSelectionKind("section");
            setSelectedId(id);
          }}
          onSelectTheme={() => {
            setSelectionKind("theme");
            setSelectedId(null);
          }}
          onReorder={handleReorder}
          onDuplicate={handleDuplicate}
          onRemove={handleRemove}
          onToggleVisibility={handleToggleVisibility}
          onUpdateCover={handleUpdateCover}
          onUpdateTheme={handleUpdateTheme}
          onUpdateSection={handleUpdateSection}
        />
        {generating && generateProgress ? (
          <GenerateProgressOverlay progress={generateProgress} onCancel={handleCancelGenerate} />
        ) : null}
        <RecentReportsPanel
          refreshKey={reportsRefreshKey}
          selectedReportId={selectedReportId}
          onSelectReport={handleSelectReport}
        />
      </div>
    </div>
  );
}

export default ReportBuilder;
