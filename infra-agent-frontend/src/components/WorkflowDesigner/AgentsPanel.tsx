"use client";

import { useMemo, useState, type ComponentType, type DragEvent } from "react";
import {
  FaChartLine,
  FaHdd,
  FaDesktop,
  FaUsers,
  FaWifi,
  FaServer,
  FaBrain,
  FaDatabase,
  FaFileAlt,
  FaCubes,
} from "react-icons/fa";
import { Search, WifiOff } from "lucide-react";
import { getAvatar, type AgentLabel } from "@/lib/avatars";
import { useListAgentsQuery } from "@/features/teams/teamsApi";
import type { AgentResponse } from "@/features/teams/teamsApi.types";
import { cn } from "@/lib/utils";
import { FloatingPanel } from "./FloatingPanel";
import styles from "./AgentsPanel.module.css";
import type { AgentCatalogEntry, AgentsPanelProps } from "./AgentsPanel.types";

const TYPE_MAPPING: Record<string, string> = {
  coordinator: "operations-manager",
  monitoring: "level1-support",
  hardware: "hardware-operations",
  operating_system: "operating-system-management",
  network: "wlan-network-specialist",
  machine_setup: "neoforge-gpu-agent",
  ai_workload: "metrumai-insights-agent",
  database: "database-agent",
  reporting: "report-generator",
  virtualization: "virtualization-agent",
  cooling: "liquid-cooling-agent",
  storage: "storage-agent",
};

const LABEL_MAPPING: Record<string, AgentLabel> = {
  "Operations Manager Agent": "Operations Manager",
  "Level 1 Support Agent": "Level 1 Support",
  "Systems Admin Hardware Agent": "Hardware Operations",
  "Systems Admin OS Agent": "OS Operations",
  "WLAN Network Agent": "WLAN Network Specialist",
  "Vast.ai Agent": "NeoCloud Provisioning Agent",
  "MetrumAI Insights Agent": "MetrumAI Insights Agent",
  "Database Agent": "Database Agent",
  "Report Generator Agent": "Report Generator Agent",
  "Virtualization Agent": "Virtualization Agent",
  storage_agent: "storage_agent",
  "Liquid Cooling Agent": "Liquid Cooling Agent",
  "Storage Agent": "Storage Agent",
};

const ICON_MAPPING: Record<string, ComponentType<{ className?: string }>> = {
  "operations-manager": FaUsers,
  "level1-support": FaChartLine,
  "hardware-operations": FaHdd,
  "operating-system-management": FaDesktop,
  "wlan-network-specialist": FaWifi,
  "neoforge-gpu-agent": FaServer,
  "metrumai-insights-agent": FaBrain,
  "database-agent": FaDatabase,
  "report-generator": FaFileAlt,
  "virtualization-agent": FaCubes,
};

const HIDDEN_AGENT_LABELS = new Set<AgentLabel>(["Database Agent", "WLAN Network Specialist"]);
const ORCHESTRATOR_LABELS: AgentLabel[] = ["Operations Manager"];
const REPORTING_LABELS: AgentLabel[] = ["Report Generator Agent"];
const LEVEL1_LABELS: AgentLabel[] = ["Level 1 Support"];

function mapApiAgentToCatalogEntry(apiAgent: AgentResponse): AgentCatalogEntry {
  const uiType =
    TYPE_MAPPING[apiAgent.agent_type] || apiAgent.name?.replace(/_/g, "-") || apiAgent.agent_type;
  const uiLabel = (LABEL_MAPPING[apiAgent.display_name] ?? apiAgent.display_name) as AgentLabel;

  const tools = apiAgent.default_tools
    ? Object.keys(apiAgent.default_tools).filter((tool) => apiAgent.default_tools?.[tool]?.enabled)
    : [];

  const capabilities = apiAgent.capabilities ? Object.keys(apiAgent.capabilities) : [];

  return {
    type: uiType,
    label: uiLabel,
    tagline: apiAgent.description || "Infrastructure management agent",
    description: apiAgent.description || "Manages infrastructure operations",
    icon: ICON_MAPPING[uiType] || FaUsers,
    cost: "2.5$/h",
    capabilities:
      capabilities.length > 0
        ? capabilities
        : ["Infrastructure management", "Automated operations", "System monitoring"],
    strengths: ["Reliable", "Efficient", "Automated"],
    tools,
    avatar: getAvatar(uiLabel) || getAvatar("Operations Manager"),
  };
}

function agentMatchesSearch(agent: AgentCatalogEntry, query: string): boolean {
  if (!query) return true;
  const haystack = [
    agent.label,
    agent.tagline,
    agent.description,
    ...agent.capabilities,
    ...(agent.tools ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function filterAvailableLabels(labels: AgentLabel[], availableLabels: AgentLabel[]): AgentLabel[] {
  return labels.filter((label) => availableLabels.includes(label));
}

function buildAgentCatalogSections(
  availableLabels: AgentLabel[],
): { caption?: string; items: AgentLabel[] }[] {
  const placedLabels = new Set<AgentLabel>([
    ...ORCHESTRATOR_LABELS,
    ...REPORTING_LABELS,
    ...LEVEL1_LABELS,
  ]);
  const level2Labels = availableLabels.filter((label) => !placedLabels.has(label));

  return [
    { caption: "Orchestrator", items: filterAvailableLabels(ORCHESTRATOR_LABELS, availableLabels) },
    {
      caption: "Reporting Specialist",
      items: filterAvailableLabels(REPORTING_LABELS, availableLabels),
    },
    { caption: "Level 1 specialist", items: filterAvailableLabels(LEVEL1_LABELS, availableLabels) },
    { caption: "Level 2 specialist", items: level2Labels },
  ].filter((section) => section.items.length > 0);
}

function AgentCardSkeleton() {
  return (
    <article className={styles.agentCardSkeleton} aria-hidden="true">
      <div className={styles.skeletonCardHeader}>
        <div className={cn(styles.skeleton, styles.skeletonAvatar)} />
      </div>
      <div className={styles.skeletonCardContent}>
        <div className={cn(styles.skeleton, styles.skeletonTitle)} />
        <div className={cn(styles.skeleton, styles.skeletonTagline)} />
        <div className={cn(styles.skeleton, styles.skeletonBadge)} />
        <div className={cn(styles.skeleton, styles.skeletonDescLine)} />
        <div className={cn(styles.skeleton, styles.skeletonDescLine)} />
        <div className={cn(styles.skeleton, styles.skeletonDescLineShort)} />
        <div className={styles.skeletonCapabilityList}>
          <div className={cn(styles.skeleton, styles.skeletonCapability)} />
          <div className={cn(styles.skeleton, styles.skeletonCapability)} />
          <div className={cn(styles.skeleton, styles.skeletonCapability)} />
        </div>
      </div>
    </article>
  );
}

function AgentsPanelSkeleton() {
  return (
    <output className={styles.skeletonList} aria-busy="true" aria-label="Loading agents">
      <AgentCardSkeleton />
      <div className={styles.sectionRow}>
        <span className={cn(styles.skeleton, styles.skeletonSectionCaption)} />
        <span className={styles.sectionDivider} />
      </div>
      <AgentCardSkeleton />
      <AgentCardSkeleton />
    </output>
  );
}

/**
 * "Agent Catalog" panel: draggable agent-type cards grouped into
 * orchestration tiers (Orchestrator / Reporting / Level 1 / Level 2),
 * sourced from the registered-agent API (`useListAgentsQuery`, added to
 * `teamsApi.ts` for this phase). Dropping a card onto the canvas is
 * handled by the parent via `onDragStart`; clicking a card (mouse or
 * keyboard) calls `onAgentSelect` — the accessible equivalent, since
 * native HTML drag-and-drop has no keyboard path.
 */
export function AgentsPanel({ onDragStart, onAgentSelect }: AgentsPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: agentsResponse,
    isLoading,
    error,
  } = useListAgentsQuery({
    is_active: true,
    is_public: true,
  });

  const allAgents: AgentCatalogEntry[] = useMemo(() => {
    if (!agentsResponse?.agents) return [];
    return agentsResponse.agents
      .filter((agent) => agent.is_active && agent.is_public)
      .map(mapApiAgentToCatalogEntry)
      .filter((agent) => !HIDDEN_AGENT_LABELS.has(agent.label));
  }, [agentsResponse]);

  const byLabel = useMemo(() => {
    const map: Partial<Record<AgentLabel, AgentCatalogEntry>> = {};
    allAgents.forEach((agent) => {
      map[agent.label] = agent;
    });
    return map;
  }, [allAgents]);

  const sections = useMemo(() => {
    const availableLabels = allAgents.map((agent) => agent.label);
    return buildAgentCatalogSections(availableLabels);
  }, [allAgents]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredSections = useMemo(() => {
    if (!normalizedSearch) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((label) => {
          const agent = byLabel[label];
          return agent !== undefined && agentMatchesSearch(agent, normalizedSearch);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, byLabel, normalizedSearch]);

  const handleCardDrag = (event: DragEvent, agent: AgentCatalogEntry) => {
    event.dataTransfer.setData("application/json", JSON.stringify({ type: "agent", agent }));
    onDragStart(event, "agent", agent.type, agent.label, agent);
  };

  const searchBar = (
    <div className={styles.searchContainer}>
      <Search size={14} className={styles.searchIcon} aria-hidden="true" />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search agents..."
        className={styles.searchInput}
        aria-label="Search agents"
      />
    </div>
  );

  if (isLoading) {
    return (
      <FloatingPanel
        position="left-top"
        title="Agent Catalog"
        collapsible={false}
        className={cn(styles.avoidRfButtons, styles.belowTeamBuilder)}
      >
        <div className={styles.panelBody}>
          {searchBar}
          <AgentsPanelSkeleton />
        </div>
      </FloatingPanel>
    );
  }

  if (error) {
    return (
      <FloatingPanel
        position="left-top"
        title="Agent Catalog"
        collapsible={false}
        className={cn(styles.avoidRfButtons, styles.belowTeamBuilder)}
      >
        <div className={styles.panelBody}>
          {searchBar}
          <div className={styles.errorState} role="alert">
            <WifiOff size={20} className={styles.errorIcon} aria-hidden="true" />
            <p className={styles.errorTitle}>Could not load agents</p>
            <p className={styles.errorDescription}>
              The agent catalog service is unreachable. Check your connection or try again.
            </p>
          </div>
        </div>
      </FloatingPanel>
    );
  }

  return (
    <FloatingPanel
      position="left-top"
      title="Agent Catalog"
      collapsible={false}
      className={cn(styles.avoidRfButtons, styles.belowTeamBuilder)}
    >
      <div className={styles.panelBody}>
        {searchBar}
        {filteredSections.length === 0 && normalizedSearch ? (
          <p className={styles.emptySearch}>No agents match your search.</p>
        ) : null}
        {filteredSections.map((section) => (
          <div key={section.caption ?? "top"}>
            {section.caption && (
              <div className={styles.sectionRow}>
                <span className={styles.sectionCaption}>{section.caption}</span>
                <span className={styles.sectionDivider} />
              </div>
            )}

            <ul className={styles.cardList} aria-label={section.caption ?? "Agents"}>
              {section.items.map((label) => {
                const agent = byLabel[label];
                if (!agent) return null;

                return (
                  // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- native HTML5 drag-and-drop requires `draggable`/`onDragStart` on the source element itself; the nested <button> below already covers click/keyboard activation as the accessible equivalent, since drag-and-drop has no native keyboard path.
                  <li
                    key={agent.label}
                    className={styles.agentCard}
                    draggable
                    onDragStart={(event) => handleCardDrag(event, agent)}
                  >
                    <button
                      type="button"
                      className={styles.agentCardButton}
                      onClick={() => onAgentSelect?.(agent)}
                      aria-label={`${agent.label} – ${agent.tagline}`}
                    >
                      <div className={styles.cardHeader}>
                        <div className={styles.avatar}>
                          {/* eslint-disable-next-line @next/next/no-img-element -- draggable catalog thumbnail sourced from a runtime avatar map; next/image's fixed intrinsic sizing fights the card's fluid aspect-ratio layout here. */}
                          <img
                            src={getAvatar(agent.label)}
                            alt=""
                            className={styles.avatarImg}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      </div>

                      <div className={styles.cardContent}>
                        <div className={styles.titleBlock}>
                          <h3 className={styles.cardTitle}>{agent.label}</h3>
                        </div>

                        <p className={styles.cardDescription}>{agent.description}</p>

                        <ul className={styles.capabilityList} aria-label="Key capabilities">
                          {agent.capabilities.slice(0, 3).map((capability) => (
                            <li key={capability} className={styles.capabilityItem}>
                              <span className={styles.capabilityDot} aria-hidden="true" />
                              <span className={styles.capabilityText}>{capability}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </FloatingPanel>
  );
}

export default AgentsPanel;
