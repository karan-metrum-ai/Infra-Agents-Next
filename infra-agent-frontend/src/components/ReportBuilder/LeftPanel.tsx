"use client";

import { LayoutGrid, Layers, Plus } from "lucide-react";

import { Button } from "@/components/ui/Button/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/Tabs/Tabs";
import { cn } from "@/lib/utils";

import ComponentsList from "./ComponentsList";
import styles from "./LeftPanel.module.css";
import type { LeftPanelMode, LeftPanelProps } from "./LeftPanel.types";
import TemplateCards from "./TemplateCards";

/** Gate until drag-and-drop component library is production-ready. */
export const COMPONENTS_TAB_ENABLED = false;

export function LeftPanel({
  mode,
  onModeChange,
  locked = false,
  activeTemplateId = "",
  onAddComponent,
  onLoadTemplate,
  onGenerateDirect,
  generating = false,
  onCreateCustom,
}: LeftPanelProps) {
  const showComponents = COMPONENTS_TAB_ENABLED && mode === "components";

  return (
    <aside className={styles.leftPanel}>
      <Tabs
        value={mode}
        onValueChange={(value) => {
          if (value === "components" && !COMPONENTS_TAB_ENABLED) return;
          onModeChange(value as LeftPanelMode);
        }}
      >
        <TabsList className={styles.panelTabs}>
          <TabsTrigger
            value="templates"
            className={cn(styles.panelTab, mode === "templates" && styles.panelTabActive)}
          >
            <LayoutGrid size={14} />
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="components"
            disabled={!COMPONENTS_TAB_ENABLED}
            title={COMPONENTS_TAB_ENABLED ? undefined : "Components — coming soon"}
            className={cn(
              styles.panelTab,
              mode === "components" && styles.panelTabActive,
              !COMPONENTS_TAB_ENABLED && styles.panelTabDisabled,
            )}
          >
            <Layers size={14} />
            Components
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className={styles.leftPanelBody}>
        <div className={styles.panelHeader}>
          <span className={styles.panelHeaderIcon}>
            {showComponents ? <Layers size={14} /> : <LayoutGrid size={14} />}
          </span>
          <span>{showComponents ? "Editable Components" : "Available Templates"}</span>
        </div>

        {showComponents ? (
          locked ? (
            <p className={styles.panelHint}>
              This is a built-in template. You can reorder or remove sections and adjust each
              section&apos;s statistics. To add components, start a Custom Template.
            </p>
          ) : (
            <ComponentsList onAddComponent={onAddComponent} />
          )
        ) : (
          <TemplateCards
            onLoadTemplate={onLoadTemplate}
            activeTemplateId={activeTemplateId}
            onGenerateDirect={onGenerateDirect}
            generating={generating}
          />
        )}
      </div>

      {showComponents && (
        <div className={styles.leftPanelFooter}>
          <Button
            variant="ghost"
            size="sm"
            className={styles.customTemplateBtn}
            onClick={onCreateCustom}
          >
            <Plus data-icon size={14} />
            Custom Template
          </Button>
        </div>
      )}
    </aside>
  );
}

export default LeftPanel;
