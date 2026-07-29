"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Wrench,
  Loader2,
  AlertCircle,
  Eye,
  PenLine,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetToolCatalogQuery } from "@/features/workflows/workflowsApi";
import { useListAgentsQuery } from "@/features/teams/teamsApi";
import type { CatalogCategory, CatalogFeature } from "@/features/workflows/workflowsApi.types";
import { getCategoryIcon, getProviderIcon } from "@/utils/catalogIcons";
import { resolveOperationType } from "@/utils/catalogOperationType";
import { FloatingPanel } from "./FloatingPanel";
import styles from "./ToolCatalogPanel.module.css";

type OperationFilter = "all" | "read" | "write";

function formatAgentLabel(name: string, displayNames: Map<string, string>): string {
  return displayNames.get(name) ?? name.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function OperationTag({ type }: { type: "read" | "write" }) {
  return (
    <span
      className={type === "write" ? styles.tagWrite : styles.tagRead}
      title={type === "write" ? "Write operation — modifies state" : "Read-only — no state changes"}
    >
      {type === "write" ? (
        <PenLine size={10} aria-hidden="true" />
      ) : (
        <Eye size={10} aria-hidden="true" />
      )}
      {type === "write" ? "Write" : "Read-only"}
    </span>
  );
}

/** Groups a provider's features by their optional `group` field (the original
 * provider name, when a category organizes providers by operation_type instead
 * of by sub-system). Categories that don't set `group` render as a single
 * ungrouped list. */
function groupFeatures(
  features: CatalogFeature[],
): { group: string | null; items: CatalogFeature[] }[] {
  if (!features.some((f) => f.group)) {
    return [{ group: null, items: features }];
  }
  const order: string[] = [];
  const byGroup = new Map<string, CatalogFeature[]>();
  features.forEach((feature) => {
    const key = feature.group ?? "";
    if (!byGroup.has(key)) {
      order.push(key);
      byGroup.set(key, []);
    }
    byGroup.get(key)?.push(feature);
  });
  return order.map((key) => ({ group: key || null, items: byGroup.get(key) ?? [] }));
}

interface FeatureCardProps {
  feature: CatalogFeature;
  agentDisplayNames: Map<string, string>;
}

function FeatureCard({ feature, agentDisplayNames }: FeatureCardProps) {
  const operationType = resolveOperationType(feature);

  return (
    <article className={styles.featureCard}>
      <div className={styles.featureHeader}>
        <span className={styles.featureName}>{feature.display_name}</span>
        <OperationTag type={operationType} />
      </div>
      {feature.description && <p className={styles.featureDescription}>{feature.description}</p>}
      <div className={styles.featureMeta}>
        <span className={styles.metaLabel}>
          <Users size={10} aria-hidden="true" />
          Agents with access
        </span>
        {feature.agents_with_access.length > 0 ? (
          <div className={styles.agentChipList}>
            {feature.agents_with_access.map((agent) => (
              <span key={agent} className={styles.agentChip} title={agent}>
                {formatAgentLabel(agent, agentDisplayNames)}
              </span>
            ))}
          </div>
        ) : (
          <span className={styles.noAgents}>No agents assigned</span>
        )}
      </div>
    </article>
  );
}

function getProviderKey(catId: string, provId: string): string {
  return `${catId}:${provId}`;
}

function getGroupKey(catId: string, provId: string, group: string): string {
  return `${catId}:${provId}:${group}`;
}

function matchesOperationFilter(feature: CatalogFeature, filter: OperationFilter): boolean {
  if (filter === "all") return true;
  return resolveOperationType(feature) === filter;
}

function matchesSearchQuery(
  feature: CatalogFeature,
  providerName: string,
  categoryName: string,
  query: string,
): boolean {
  if (!query) return true;
  return (
    feature.display_name.toLowerCase().includes(query) ||
    feature.mcp_tool.toLowerCase().includes(query) ||
    providerName.toLowerCase().includes(query) ||
    categoryName.toLowerCase().includes(query) ||
    feature.agents_with_access.some((agent) => agent.toLowerCase().includes(query))
  );
}

/**
 * Read-only "Tool Catalog" panel: the full tool catalog hierarchy
 * (categories → providers → features) with search + read/write filtering
 * and an expand/collapse tree. Unlike `AgentInspectorPanel`'s "Configure
 * Tools" section, this panel isn't tied to a selected agent — it's a
 * standing reference/browsing surface, always visible on the canvas.
 */
export function ToolCatalogPanel() {
  const [search, setSearch] = useState("");
  const [operationFilter, setOperationFilter] = useState<OperationFilter>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const {
    data: catalog,
    isLoading,
    isError,
  } = useGetToolCatalogQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: agentsData } = useListAgentsQuery({ is_active: true });

  const agentDisplayNames = useMemo(() => {
    const map = new Map<string, string>();
    agentsData?.agents?.forEach((agent) => {
      map.set(agent.name, agent.display_name);
    });
    return map;
  }, [agentsData]);

  const filtered = useMemo<CatalogCategory[]>(() => {
    if (!catalog) return [];
    const q = search.trim().toLowerCase();

    return catalog.categories.reduce<CatalogCategory[]>((acc, cat) => {
      const providers = cat.providers.reduce<CatalogCategory["providers"]>((provAcc, prov) => {
        const features = prov.features.filter(
          (feature) =>
            matchesOperationFilter(feature, operationFilter) &&
            matchesSearchQuery(feature, prov.display_name, cat.display_name, q),
        );
        if (features.length > 0) provAcc.push({ ...prov, features });
        return provAcc;
      }, []);
      if (providers.length > 0) acc.push({ ...cat, providers });
      return acc;
    }, []);
  }, [catalog, search, operationFilter]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const toggleProvider = (catId: string, provId: string) => {
    const providerKey = getProviderKey(catId, provId);
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(providerKey)) next.delete(providerKey);
      else next.add(providerKey);
      return next;
    });
  };

  const toggleGroup = (catId: string, provId: string, group: string) => {
    const groupKey = getGroupKey(catId, provId, group);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  return (
    <FloatingPanel
      position="right-top"
      size="large"
      title="Tool Catalog"
      collapsible={false}
      className={cn(styles.panelShell, styles.slideIn, styles.panel)}
      dynamicPosition={{ toolsCollapsed: true, modelClientCollapsed: true }}
    >
      <div className={styles.panelBody}>
        <div className={styles.toolbar}>
          <div className={styles.searchContainer}>
            <Search size={14} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search tools..."
              className={styles.searchInput}
              aria-label="Search tools"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className={styles.operationFilter}
            value={operationFilter}
            onChange={(event) => setOperationFilter(event.target.value as OperationFilter)}
            aria-label="Filter tools by operation type"
          >
            <option value="all">All</option>
            <option value="read">Read-only</option>
            <option value="write">Write</option>
          </select>
        </div>

        {isLoading && (
          <output className={styles.stateCenter} aria-live="polite">
            <Loader2 size={20} className={styles.spinner} aria-hidden="true" />
            <span className={styles.stateLabel}>Loading catalog…</span>
          </output>
        )}

        {isError && !isLoading && (
          <div className={styles.stateCenter} role="alert">
            <AlertCircle size={20} className={styles.errorIcon} aria-hidden="true" />
            <span className={styles.stateLabel}>Failed to load catalog</span>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Wrench size={28} aria-hidden="true" />
            </div>
            <span className={styles.emptyLabel}>
              {search || operationFilter !== "all"
                ? "No tools match your filters"
                : "No tools available"}
            </span>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className={styles.catalogTree}>
            {filtered.map((cat) => {
              const isOpen = expandedCategories.has(cat.id);
              const totalFeatures = cat.providers.reduce((sum, p) => sum + p.features.length, 0);
              const CategoryIcon = getCategoryIcon(cat.id);

              return (
                <div
                  key={cat.id}
                  className={cn(styles.categoryCard, isOpen && styles.categoryCardOpen)}
                >
                  <button
                    type="button"
                    className={styles.categoryHeader}
                    onClick={() => toggleCategory(cat.id)}
                    aria-expanded={isOpen}
                  >
                    <div className={styles.categoryIconWrap}>
                      <CategoryIcon size={16} className={styles.categoryIcon} aria-hidden="true" />
                    </div>
                    <div className={styles.categoryTitleBlock}>
                      <span className={styles.categoryName}>{cat.display_name}</span>
                      {cat.description && (
                        <span className={styles.categoryDesc}>{cat.description}</span>
                      )}
                    </div>
                    <span className={styles.categoryCount}>{totalFeatures}</span>
                    <span className={styles.categoryChevron}>
                      {isOpen ? (
                        <ChevronDown size={14} aria-hidden="true" />
                      ) : (
                        <ChevronRight size={14} aria-hidden="true" />
                      )}
                    </span>
                  </button>

                  {isOpen && (
                    <div className={styles.categoryContent}>
                      {cat.providers.map((prov) => {
                        const ProviderIcon = getProviderIcon(prov.id);
                        const providerKey = getProviderKey(cat.id, prov.id);
                        const isProviderOpen = expandedProviders.has(providerKey);

                        return (
                          <div
                            key={prov.id}
                            className={cn(
                              styles.providerCard,
                              isProviderOpen && styles.providerCardOpen,
                            )}
                          >
                            <button
                              type="button"
                              className={styles.providerHeader}
                              onClick={() => toggleProvider(cat.id, prov.id)}
                              aria-expanded={isProviderOpen}
                            >
                              <div className={styles.providerIconWrap}>
                                <ProviderIcon
                                  size={10}
                                  className={styles.providerIcon}
                                  aria-hidden="true"
                                />
                              </div>
                              <span className={styles.providerName}>{prov.display_name}</span>
                              <span className={styles.providerCount}>{prov.features.length}</span>
                              <span className={styles.providerChevron}>
                                {isProviderOpen ? (
                                  <ChevronDown size={10} aria-hidden="true" />
                                ) : (
                                  <ChevronRight size={10} aria-hidden="true" />
                                )}
                              </span>
                            </button>

                            {isProviderOpen && (
                              <div className={styles.providerContent}>
                                {groupFeatures(prov.features).map((grp) => {
                                  if (!grp.group) {
                                    return (
                                      <div
                                        key={`${prov.id}-ungrouped`}
                                        className={styles.featureList}
                                      >
                                        {grp.items.map((feat) => (
                                          <FeatureCard
                                            key={feat.id}
                                            feature={feat}
                                            agentDisplayNames={agentDisplayNames}
                                          />
                                        ))}
                                      </div>
                                    );
                                  }

                                  const groupKey = getGroupKey(cat.id, prov.id, grp.group);
                                  const isGroupOpen = expandedGroups.has(groupKey);

                                  return (
                                    <div key={grp.group} className={styles.featureGroup}>
                                      <button
                                        type="button"
                                        className={styles.featureGroupHeader}
                                        onClick={() =>
                                          toggleGroup(cat.id, prov.id, grp.group as string)
                                        }
                                        aria-expanded={isGroupOpen}
                                      >
                                        <span className={styles.featureGroupChevron}>
                                          {isGroupOpen ? (
                                            <ChevronDown size={9} aria-hidden="true" />
                                          ) : (
                                            <ChevronRight size={9} aria-hidden="true" />
                                          )}
                                        </span>
                                        <span className={styles.featureGroupLabel}>
                                          {grp.group}
                                        </span>
                                        <span className={styles.featureGroupCount}>
                                          {grp.items.length}
                                        </span>
                                      </button>

                                      {isGroupOpen && (
                                        <div className={styles.featureList}>
                                          {grp.items.map((feat) => (
                                            <FeatureCard
                                              key={feat.id}
                                              feature={feat}
                                              agentDisplayNames={agentDisplayNames}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FloatingPanel>
  );
}

export default ToolCatalogPanel;
