"use client";

import {
  Eye,
  EyeOff,
  FileText,
  Grid3x3,
  Image as ImageIcon,
  LineChart,
  PenLine,
  Puzzle,
  Settings2,
  Table,
} from "lucide-react";
import { cloneElement, isValidElement, useId, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/Input/Input";
import CatalogMetricPicker from "./CatalogMetricPicker";
import type {
  ReportCover,
  ReportSchema,
  ReportSection,
  ReportTheme,
  SectionType,
  ThemeSpacing,
} from "./reportSchema.types";
import { CHART_TYPE_OPTIONS, SECTION_TYPE_META } from "./sectionMeta";
import StatsChipSelector from "./StatsChipSelector";
import styles from "./PropertiesPanel.module.css";

/**
 * Right-side/bottom-dock inspector for editing the selected cover, section,
 * or theme. Ported from the Vite app's `components/ReportBuilder/
 * PropertiesPanel.tsx`. `PropertiesSelection` is imported directly from
 * this file by the already-built `CenterPanel.types.ts` -- kept here (not
 * split into a separate `.types.ts`) to preserve that existing contract.
 *
 * Deviation from source: the Vite version reset a `catalogAvailable` flag
 * via `useEffect(() => setCatalogAvailable(true), [sectionId])` whenever the
 * selected section changed. Here the entire "editing a section" subtree is
 * split into `SectionEditor` and rendered with `key={section.id}` from the
 * parent, so switching sections remounts it and the local
 * `catalogAvailable` state resets for free -- no effect needed.
 */

export type PropertiesSelection =
  | { kind: "cover" }
  | { kind: "section"; section: ReportSection }
  | { kind: "theme" }
  | null;

export interface PropertiesPanelProps {
  schema: ReportSchema;
  selection: PropertiesSelection;
  onSelectTheme: () => void;
  onUpdateCover: (cover: Partial<ReportCover>) => void;
  onUpdateTheme: (theme: Partial<ReportTheme>) => void;
  onUpdateSection: (id: string, updates: Partial<ReportSection>) => void;
  compact?: boolean;
  locked?: boolean;
}

const SECTION_ICONS: Record<SectionType, ReactNode> = {
  summary: <FileText size={14} />,
  metric_grid: <Grid3x3 size={14} />,
  line_chart: <LineChart size={14} />,
  data_table: <Table size={14} />,
  rich_text: <PenLine size={14} />,
  image: <ImageIcon size={14} />,
  custom: <Puzzle size={14} />,
};

const CHART_SECTION_TYPES = new Set<SectionType>(["line_chart", "data_table", "metric_grid"]);

/** Wraps a control with a properly associated `<label>` (every form control
 * needs a real label, not just adjacent text) by cloning an `id` onto it. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const content = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id ?? id })
    : children;
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      {content}
    </div>
  );
}

export default function PropertiesPanel({
  schema,
  selection,
  onSelectTheme,
  onUpdateCover,
  onUpdateTheme,
  onUpdateSection,
  compact = false,
  locked = false,
}: PropertiesPanelProps) {
  const panelClass = compact
    ? `${styles.properties} ${styles.propertiesCompact}`
    : styles.properties;

  if (!selection) {
    return (
      <aside className={panelClass}>
        <div className={styles.panelHeader}>
          <Settings2 size={16} />
          <span>Properties</span>
        </div>
        <p className={styles.panelHint}>
          Select the cover, a section, or theme to edit its properties.
        </p>
        <button type="button" className={styles.themeQuickBtn} onClick={onSelectTheme}>
          Edit Theme
        </button>
      </aside>
    );
  }

  if (selection.kind === "theme") {
    if (locked) {
      return (
        <aside className={panelClass}>
          <div className={styles.panelHeader}>
            <Settings2 size={16} />
            <span>Theme</span>
          </div>
          <p className={styles.panelHint}>Theme is locked for built-in templates.</p>
        </aside>
      );
    }
    return (
      <aside className={panelClass}>
        <div className={styles.panelHeader}>
          <Settings2 size={16} />
          <span>Theme</span>
        </div>
        <Field label="Primary Color">
          <Input
            type="color"
            value={schema.theme.primary}
            onChange={(e) => onUpdateTheme({ primary: e.target.value })}
          />
        </Field>
        <Field label="Secondary Color">
          <Input
            type="color"
            value={schema.theme.secondary}
            onChange={(e) => onUpdateTheme({ secondary: e.target.value })}
          />
        </Field>
        <Field label="Font">
          <select
            className={styles.select}
            value={schema.theme.font}
            onChange={(e) => onUpdateTheme({ font: e.target.value })}
          >
            <option value="Inter">Inter</option>
            <option value="Georgia">Georgia</option>
            <option value="monospace">Monospace</option>
          </select>
        </Field>
        <Field label="Spacing">
          <select
            className={styles.select}
            value={schema.theme.spacing}
            onChange={(e) => onUpdateTheme({ spacing: e.target.value as ThemeSpacing })}
          >
            <option value="compact">Compact</option>
            <option value="comfortable">Comfortable</option>
            <option value="spacious">Spacious</option>
          </select>
        </Field>
      </aside>
    );
  }

  if (selection.kind === "cover") {
    const { cover } = schema;
    if (locked) {
      return (
        <aside className={panelClass}>
          <div className={styles.panelHeader}>
            <Settings2 size={16} />
            <span>Cover</span>
          </div>
          <p className={styles.panelHint}>The cover is locked for built-in templates.</p>
        </aside>
      );
    }
    return (
      <aside className={panelClass}>
        <div className={styles.panelHeader}>
          <Settings2 size={16} />
          <span>Cover</span>
        </div>
        <Field label="Eyebrow">
          <Input
            value={cover.eyebrow}
            onChange={(e) => onUpdateCover({ eyebrow: e.target.value })}
          />
        </Field>
        <Field label="Title">
          <Input value={cover.title} onChange={(e) => onUpdateCover({ title: e.target.value })} />
        </Field>
        <Field label="Subtitle">
          <Input
            value={cover.subtitle}
            onChange={(e) => onUpdateCover({ subtitle: e.target.value })}
          />
        </Field>
      </aside>
    );
  }

  return (
    <SectionEditor
      key={selection.section.id}
      section={selection.section}
      compact={compact}
      locked={locked}
      panelClass={panelClass}
      onUpdateSection={onUpdateSection}
    />
  );
}

interface SectionEditorProps {
  section: ReportSection;
  compact: boolean;
  locked: boolean;
  panelClass: string;
  onUpdateSection: (id: string, updates: Partial<ReportSection>) => void;
}

function SectionEditor({
  section,
  compact,
  locked,
  panelClass,
  onUpdateSection,
}: SectionEditorProps) {
  const [catalogAvailable, setCatalogAvailable] = useState(true);
  const config = section.config || {};
  const isChartSection = CHART_SECTION_TYPES.has(section.type);
  const meta = SECTION_TYPE_META[section.type];
  const contentFieldId = useId();
  const dataHintFieldId = useId();

  return (
    <aside className={panelClass}>
      <div className={styles.sectionEditorHeader}>
        <div className={styles.sectionEditorTitleRow}>
          <span className={styles.sectionEditorIcon}>{SECTION_ICONS[section.type]}</span>
          <div className={styles.sectionEditorTitles}>
            <span className={styles.sectionEditorType}>{meta.label}</span>
            <span className={styles.sectionEditorContext}>Editing selected section</span>
          </div>
        </div>
        {!locked && (
          <button
            type="button"
            role="switch"
            aria-checked={section.visible}
            aria-label={section.visible ? "Hide from report" : "Show in report"}
            className={section.visible ? styles.visibilityToggleOn : styles.visibilityToggleOff}
            onClick={() => onUpdateSection(section.id, { visible: !section.visible })}
          >
            {section.visible ? <Eye size={12} aria-hidden /> : <EyeOff size={12} aria-hidden />}
          </button>
        )}
      </div>

      <div className={compact ? styles.sectionEditorGrid : styles.sectionEditorStack}>
        {locked && (
          <p className={styles.panelHint}>
            Built-in section. Reorder, remove, rename, and edit statistics on the canvas; other
            properties stay locked.
          </p>
        )}

        <div className={styles.propGroup}>
          <h4 className={styles.propGroupTitle}>General</h4>
          <Field label="Section title">
            <Input
              value={section.title}
              onChange={(e) => onUpdateSection(section.id, { title: e.target.value })}
            />
          </Field>
        </div>

        {!locked && isChartSection && catalogAvailable && (
          <div className={`${styles.propGroup} ${styles.propGroupWide}`}>
            <h4 className={styles.propGroupTitle}>Data source</h4>
            <CatalogMetricPicker
              metricId={section.metric_id}
              dataHint={section.data_hint}
              chartType={section.chart_type}
              sectionTitle={section.title}
              onAvailabilityChange={setCatalogAvailable}
              onChange={(update) => onUpdateSection(section.id, update)}
            />
          </div>
        )}

        {!locked && isChartSection && (
          <div className={styles.propGroup}>
            <h4 className={styles.propGroupTitle}>Chart style</h4>
            <div className={styles.chartTypePillRow} role="radiogroup" aria-label="Chart type">
              {CHART_TYPE_OPTIONS.map((opt) => {
                const active = (section.chart_type || "auto") === opt.id;
                return (
                  // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- compact pill-button
                  // radio group (chart type); a native `<input type="radio">` doesn't fit this
                  // toggleable-pill interaction/visual, same precedent as ReportCanvas.tsx's
                  // role="button" section cards.
                  <button
                    key={opt.id}
                    type="button"
                    // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- custom chart-type pill; a native <input type="radio"> can't be skinned to this pill row without losing the design system's visual language
                    role="radio"
                    aria-checked={active}
                    className={active ? styles.chartTypePillActive : styles.chartTypePill}
                    onClick={() => onUpdateSection(section.id, { chart_type: opt.id })}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isChartSection && (
          <div className={styles.propGroup}>
            <h4 className={styles.propGroupTitle}>Statistics</h4>
            <StatsChipSelector
              section={section}
              onChange={(stats) => onUpdateSection(section.id, { stats })}
            />
          </div>
        )}

        {!locked && section.type === "metric_grid" && (
          <div className={styles.propGroup}>
            <h4 className={styles.propGroupTitle}>Layout</h4>
            <Field label="Grid columns">
              <Input
                type="number"
                min={1}
                max={4}
                value={(config.columns as number) || 3}
                onChange={(e) =>
                  onUpdateSection(section.id, {
                    config: { ...config, columns: Number(e.target.value) },
                  })
                }
              />
            </Field>
          </div>
        )}

        {!locked &&
          (section.type === "rich_text" ||
            section.type === "summary" ||
            section.type === "custom") && (
            <div className={styles.propGroup}>
              <label className={styles.propGroupTitle} htmlFor={contentFieldId}>
                Content
              </label>
              <textarea
                id={contentFieldId}
                className={styles.textarea}
                rows={5}
                value={(config.content as string) || ""}
                onChange={(e) =>
                  onUpdateSection(section.id, { config: { ...config, content: e.target.value } })
                }
              />
            </div>
          )}

        {!locked && section.type === "image" && (
          <div className={styles.propGroup}>
            <h4 className={styles.propGroupTitle}>Image</h4>
            <Field label="Alt text">
              <Input
                value={(config.alt as string) || ""}
                onChange={(e) =>
                  onUpdateSection(section.id, { config: { ...config, alt: e.target.value } })
                }
              />
            </Field>
          </div>
        )}

        {!locked && (!isChartSection || !catalogAvailable) && (
          <div className={styles.propGroup}>
            <label className={styles.propGroupTitle} htmlFor={dataHintFieldId}>
              {isChartSection && !catalogAvailable ? "Data hints (fallback)" : "Data hints"}
            </label>
            <Input
              id={dataHintFieldId}
              placeholder="power, cpu, utilization"
              value={(section.data_hint || []).join(", ")}
              onChange={(e) =>
                onUpdateSection(section.id, {
                  data_hint: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        )}
      </div>
    </aside>
  );
}
