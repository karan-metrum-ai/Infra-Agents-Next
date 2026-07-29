"use client";

import { useMemo, useState } from "react";
import type {
  CatalogCategory,
  CatalogFeature,
  CatalogProvider,
} from "@/features/workflows/workflowsApi.types";

/** Tools every agent has by default that shouldn't clutter the selector. */
const HIDDEN_TOOL_DEFAULTS = new Set(["list_devices", "search_rag"]);

export interface ProviderToolGroup {
  provider: CatalogProvider;
  features: CatalogFeature[];
}

export interface CategoryToolGroup {
  category: CatalogCategory;
  providers: ProviderToolGroup[];
}

function filterHidden(tools: string[]): string[] {
  return tools.filter((tool) => !HIDDEN_TOOL_DEFAULTS.has(tool));
}

function buildDisplayNameMap(categories: CatalogCategory[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of categories) {
    for (const provider of category.providers) {
      for (const feature of provider.features) {
        map.set(feature.mcp_tool, feature.display_name);
      }
    }
  }
  return map;
}

function groupToolsByCategory(
  mcpTools: string[],
  categories: CatalogCategory[],
): CategoryToolGroup[] {
  const toolSet = new Set(mcpTools);
  const result: CategoryToolGroup[] = [];

  for (const category of categories) {
    const providers: ProviderToolGroup[] = [];
    for (const provider of category.providers) {
      const features = provider.features.filter((feature) => toolSet.has(feature.mcp_tool));
      if (features.length > 0) providers.push({ provider, features });
    }
    if (providers.length > 0) result.push({ category, providers });
  }

  return result;
}

export function countFeaturesInCategory(group: CategoryToolGroup): number {
  return group.providers.reduce((sum, p) => sum + p.features.length, 0);
}

export function countSelectedInCategory(group: CategoryToolGroup, selectedTools: string[]): number {
  const selectedSet = new Set(selectedTools);
  return group.providers.reduce(
    (sum, p) => sum + p.features.filter((f) => selectedSet.has(f.mcp_tool)).length,
    0,
  );
}

/**
 * Owns the Agent Inspector's tool-selection derived state: the stable
 * "available tools" list for the selected agent, category/provider
 * groupings sourced from the full tool catalog, and which category tab is
 * active.
 *
 * Effectless by construction (see `.cursor/skills/sans-effect`). The Vite
 * original used two `useEffect`s here: one that captured a full tool
 * snapshot on agent change and only ever grew it on toggle (because the
 * parent mutates `selectedAgent.tools` down to just the selected subset),
 * and one that auto-selected the first category tab whenever the agent
 * changed. Both are replaced by pure derivation:
 *
 * - The caller mounts this hook's owning component with `key={agentKey}`
 *   so a genuinely new agent selection re-seeds `useState` fresh (Pattern
 *   5 — reset via remount) instead of an effect watching `selectedAgent`.
 * - The "only grows" behavior falls out of a plain union (Pattern 1):
 *   every render, the available set is `seedTools ∪ agentTools`, so a tool
 *   temporarily dropped from `agentTools` (no longer selected) stays
 *   visible via the seed, while a genuinely new tool (e.g. dragged onto
 *   the node from the catalog panel) shows up immediately via the union.
 * - "Auto-select first category" is a fallback computed at render time
 *   (`activeCategoryId`) rather than a state-syncing effect: if the
 *   current `selectedCategoryId` isn't present in this render's
 *   `categoryGroups` (including the initial catalog-still-loading render),
 *   it falls back to the first available category.
 */
export function useAgentInspectorToolSelection(
  agentTools: string[] | undefined,
  selectedTools: string[],
  categories: CatalogCategory[],
) {
  const [seedTools] = useState<string[]>(() => filterHidden(agentTools ?? []));

  const availableTools = useMemo(() => {
    const incoming = filterHidden(agentTools ?? []);
    return Array.from(new Set([...seedTools, ...incoming]));
  }, [seedTools, agentTools]);

  const displayNameMap = useMemo(() => buildDisplayNameMap(categories), [categories]);

  const categoryGroups = useMemo(
    () => groupToolsByCategory(availableTools, categories),
    [availableTools, categories],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    () => categoryGroups[0]?.category.id ?? null,
  );

  const activeCategoryId =
    selectedCategoryId && categoryGroups.some((g) => g.category.id === selectedCategoryId)
      ? selectedCategoryId
      : (categoryGroups[0]?.category.id ?? null);

  const providersForActiveCategory = useMemo(() => {
    if (!activeCategoryId) return [];
    return categoryGroups.find((g) => g.category.id === activeCategoryId)?.providers ?? [];
  }, [activeCategoryId, categoryGroups]);

  const selectedVisibleCount = useMemo(() => {
    const availableSet = new Set(availableTools);
    return selectedTools.filter((tool) => availableSet.has(tool)).length;
  }, [selectedTools, availableTools]);

  return {
    availableTools,
    displayNameMap,
    categoryGroups,
    activeCategoryId,
    setSelectedCategoryId,
    providersForActiveCategory,
    selectedVisibleCount,
  };
}
