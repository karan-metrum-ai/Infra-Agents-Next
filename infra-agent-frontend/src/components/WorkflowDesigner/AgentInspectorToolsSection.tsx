"use client";

import { useMemo } from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProviderIcon } from "@/utils/catalogIcons";
import {
  countFeaturesInCategory,
  countSelectedInCategory,
  useAgentInspectorToolSelection,
} from "@/hooks/useAgentInspectorToolSelection";
import type { CatalogCategory } from "@/features/workflows/workflowsApi.types";
import styles from "./AgentInspectorPanel.module.css";

interface AgentInspectorToolsSectionProps {
  agentTools: string[] | undefined;
  selectedTools: string[];
  categories: CatalogCategory[];
  onToolToggle?: (toolType: string) => void;
}

function toDisplayLabel(toolName: string): string {
  return toolName.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * "Configure Tools" section: category-tab bar + provider/feature groups
 * sourced from the tool catalog, with a flat-list fallback when the
 * catalog hasn't loaded or none of an agent's tools match a known
 * category. All derived state (available tools, category groups, active
 * tab) comes from `useAgentInspectorToolSelection` — the parent
 * (`AgentInspectorPanel`) remounts this section with `key={agentKey}` per
 * agent so that hook's one-time seed state resets cleanly (see the hook's
 * doc comment for the full effectless rationale).
 */
export function AgentInspectorToolsSection({
  agentTools,
  selectedTools,
  categories,
  onToolToggle,
}: AgentInspectorToolsSectionProps) {
  const {
    availableTools,
    displayNameMap,
    categoryGroups,
    activeCategoryId,
    setSelectedCategoryId,
    providersForActiveCategory,
    selectedVisibleCount,
  } = useAgentInspectorToolSelection(agentTools, selectedTools, categories);

  const selectedSet = useMemo(() => new Set(selectedTools), [selectedTools]);

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Configure Tools</h3>
        <div className={styles.sectionHint}>
          {selectedVisibleCount} of {availableTools.length} selected
        </div>
      </header>

      {categoryGroups.length === 0 ? (
        <div className={styles.toolsList}>
          {availableTools.map((tool) => {
            const isSelected = selectedSet.has(tool);
            return (
              <button
                key={tool}
                type="button"
                className={cn(styles.toolRow, isSelected && styles.toolSelected)}
                aria-pressed={isSelected}
                onClick={() => onToolToggle?.(tool)}
              >
                <div className={styles.toolIconWrap}>
                  <Settings className={styles.toolIcon} aria-hidden="true" />
                </div>
                <div className={styles.toolMeta}>
                  <div className={styles.toolName}>
                    {displayNameMap.get(tool) || toDisplayLabel(tool)}
                  </div>
                </div>
                <div className={styles.toolCheck} aria-hidden="true">
                  {isSelected ? "✔" : ""}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className={styles.toolsTabSection}>
            <p className={styles.toolsTabHeading}>Categories</p>
            <div className={styles.toolsTabBar} role="tablist" aria-label="Tool categories">
              {categoryGroups.map((group) => {
                const { category } = group;
                const totalCount = countFeaturesInCategory(group);
                const enabledCount = countSelectedInCategory(group, selectedTools);
                const isActive = activeCategoryId === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    id={`agent-inspector-tab-${category.id}`}
                    aria-selected={isActive}
                    aria-controls={`agent-inspector-tabpanel-${category.id}`}
                    tabIndex={isActive ? 0 : -1}
                    className={cn(styles.toolsTab, isActive && styles.toolsTabActive)}
                    onClick={() => setSelectedCategoryId(category.id)}
                    title={`${category.display_name} (${enabledCount}/${totalCount})`}
                  >
                    <span className={styles.toolsTabLabel}>{category.display_name}</span>
                    <span className={styles.toolsTabCount}>
                      {enabledCount}/{totalCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={styles.toolsCategoryContent}
            role="tabpanel"
            id={activeCategoryId ? `agent-inspector-tabpanel-${activeCategoryId}` : undefined}
            aria-labelledby={
              activeCategoryId ? `agent-inspector-tab-${activeCategoryId}` : undefined
            }
          >
            {providersForActiveCategory.map(({ provider, features }) => {
              const ProviderIcon = getProviderIcon(provider.id);
              const selectedInProvider = features.filter((f) => selectedSet.has(f.mcp_tool)).length;

              return (
                <div key={provider.id} className={styles.providerGroup}>
                  <div className={styles.providerGroupHeader}>
                    <div className={styles.providerGroupIconWrap}>
                      <ProviderIcon
                        size={11}
                        className={styles.providerGroupIcon}
                        aria-hidden="true"
                      />
                    </div>
                    <span className={styles.providerGroupName}>{provider.display_name}</span>
                    <span className={styles.providerGroupCount}>
                      {selectedInProvider}/{features.length}
                    </span>
                  </div>

                  <div className={styles.toolsList}>
                    {features.map((feature) => {
                      const isSelected = selectedSet.has(feature.mcp_tool);
                      return (
                        <button
                          key={feature.mcp_tool}
                          type="button"
                          className={cn(styles.toolRow, isSelected && styles.toolSelected)}
                          aria-pressed={isSelected}
                          onClick={() => onToolToggle?.(feature.mcp_tool)}
                        >
                          <div className={styles.toolIconWrap}>
                            <Settings className={styles.toolIcon} aria-hidden="true" />
                          </div>
                          <div className={styles.toolMeta}>
                            <div className={styles.toolName}>{feature.display_name}</div>
                          </div>
                          <div className={styles.toolCheck} aria-hidden="true">
                            {isSelected ? "✔" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default AgentInspectorToolsSection;
