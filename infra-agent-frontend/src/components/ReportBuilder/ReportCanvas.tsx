"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Eye, EyeOff, GripVertical, Palette, Pencil, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { getSectionComponent, type SectionDragHandleProps } from "./sections/registry";
import type { ReportCanvasProps } from "./ReportCanvas.types";
import type { ReportSchema, ReportSection } from "./reportSchema.types";
import type { SectionPreview } from "@/features/reports/reportsApi.types";
import styles from "./ReportCanvas.module.css";

/**
 * Ported from the Vite app's `components/ReportBuilder/ReportCanvas.tsx`.
 * Renders the dnd-kit sortable list of report sections via the
 * section-type registry (`sections/registry.ts`). The cover is NOT part of
 * this canvas — `schema.cover` is a separate field from `schema.sections`
 * and cover selection/editing is owned entirely by the orchestrator
 * (`ReportBuilder.tsx`) and `PropertiesPanel`, matching the source, which
 * never renders or selects a cover section here either.
 */

const SPACING_MAP: Record<ReportSchema["theme"]["spacing"], string> = {
  compact: "8px",
  comfortable: "12px",
  spacious: "16px",
};

const CHART_SECTION_TYPES = new Set(["line_chart", "metric_grid", "data_table"]);

interface SortableSectionProps {
  section: ReportSection;
  schema: ReportSchema;
  preview?: SectionPreview;
  previewLoading?: boolean;
  isBuilding?: boolean;
  isSelected: boolean;
  locked: boolean;
  hideSectionToolbar?: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onToggleVisibility: () => void;
  onUpdateSection: (updates: Partial<ReportSection>) => void;
}

function SortableSection({
  section,
  schema,
  preview,
  previewLoading = false,
  isBuilding = false,
  isSelected,
  locked,
  hideSectionToolbar = false,
  onSelect,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onUpdateSection,
}: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : section.visible ? 1 : 0.4,
  };

  const Component = getSectionComponent(section.type);
  const dragHandleProps: SectionDragHandleProps = { attributes, listeners };
  const isChartSection = CHART_SECTION_TYPES.has(section.type);
  const showSectionToolbar = !hideSectionToolbar && !isChartSection;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        styles.canvasSection,
        isSelected && styles.canvasSectionSelected,
        isSelected && styles.canvasSectionEditing,
        isBuilding && styles.canvasSectionBuilding,
      )}
      onClick={onSelect}
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- selectable section card contains its own nested action buttons (drag handle, edit/duplicate/visibility/delete), so it can't itself be a native <button>
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") onSelect();
      }}
    >
      {showSectionToolbar ? (
        <div className={styles.sectionToolbar}>
          <button
            type="button"
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder section"
          >
            <GripVertical size={14} />
          </button>
          {!locked && (
            <span className={styles.sectionTypeBadge}>{section.type.replace("_", " ")}</span>
          )}
          <div className={styles.sectionActions}>
            <button
              type="button"
              className={cn(styles.iconBtn, isSelected && styles.iconBtnActive)}
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
              }}
              aria-label="Edit section"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            {!locked && (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={(event) => {
                  event.stopPropagation();
                  onDuplicate();
                }}
                aria-label="Duplicate section"
                title="Duplicate"
              >
                <Copy size={12} />
              </button>
            )}
            <span className={styles.sectionActionsDivider} aria-hidden />
            {!locked && (
              <button
                type="button"
                className={styles.iconBtn}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleVisibility();
                }}
                aria-label={section.visible ? "Hide section" : "Show section"}
                title={section.visible ? "Hide" : "Show"}
              >
                {section.visible ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            )}
            <button
              type="button"
              className={cn(styles.iconBtn, styles.iconBtnDanger)}
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              aria-label="Remove section"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ) : null}
      {Component ? (
        <Component
          section={section}
          theme={schema.theme}
          preview={preview}
          previewLoading={previewLoading}
          isSelected={isSelected}
          canvasEditable
          dragHandleProps={isChartSection ? dragHandleProps : undefined}
          onUpdateSection={onUpdateSection}
          onRemoveSection={onRemove}
        />
      ) : (
        <p>Unknown section type: {section.type}</p>
      )}
    </div>
  );
}

export default function ReportCanvas({
  schema,
  sectionPreviews = {},
  sectionPreviewsLoading = false,
  buildingSectionId = null,
  selectedSectionId,
  onSelectSection,
  onSelectTheme,
  onReorder,
  onDuplicate,
  onRemove,
  onToggleVisibility,
  onUpdateSection,
  hideToolbar = false,
  hideSectionToolbar = false,
  locked = false,
}: ReportCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = schema.sections.findIndex((s) => s.id === active.id);
    const newIndex = schema.sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(schema.sections, oldIndex, newIndex));
  };

  const gap = SPACING_MAP[schema.theme.spacing];

  return (
    <div className={styles.canvas}>
      {!hideToolbar && (
        <div className={styles.canvasToolbar}>
          <span className={styles.canvasLabel}>Editor</span>
          <button type="button" className={styles.themeBtn} onClick={onSelectTheme}>
            <Palette size={14} />
            Theme
          </button>
        </div>
      )}
      <div className={styles.canvasScroll} style={{ fontFamily: schema.theme.font, gap }}>
        {schema.sections.length === 0 ? (
          <div className={styles.emptyCanvas}>
            <p>Select a template from the left panel to load sections.</p>
            <span className={styles.emptyCanvasHint}>Drag sections to reorder once loaded</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={schema.sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {schema.sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  schema={schema}
                  preview={sectionPreviews[section.id]}
                  previewLoading={
                    sectionPreviewsLoading &&
                    !sectionPreviews[section.id] &&
                    CHART_SECTION_TYPES.has(section.type)
                  }
                  isBuilding={buildingSectionId === section.id}
                  isSelected={selectedSectionId === section.id}
                  locked={locked}
                  hideSectionToolbar={hideSectionToolbar}
                  onSelect={() => onSelectSection(section.id)}
                  onDuplicate={() => onDuplicate(section.id)}
                  onRemove={() => onRemove(section.id)}
                  onToggleVisibility={() => onToggleVisibility(section.id)}
                  onUpdateSection={(updates) => onUpdateSection(section.id, updates)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
