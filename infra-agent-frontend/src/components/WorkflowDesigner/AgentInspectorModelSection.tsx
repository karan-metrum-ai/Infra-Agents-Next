"use client";

import { useMemo, useState } from "react";
import { Cloud, Cpu, Globe, Server, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./AgentInspectorPanel.module.css";
import type { AgentInspectorModelClientRaw, ModelOption } from "./AgentInspectorPanel.types";

function providerIcon(provider: string): LucideIcon {
  switch (provider.toLowerCase()) {
    case "openai":
      return Cloud;
    case "anthropic":
      return Cpu;
    case "google":
      return Globe;
    case "ollama":
      return Server;
    case "microsoft azure":
      return Cloud;
    default:
      return Settings;
  }
}

function buildModelOptions(modelClient: AgentInspectorModelClientRaw | undefined): ModelOption[] {
  if (!modelClient) return [];
  const model = modelClient.config?.model || "Unknown";
  const baseUrl = modelClient.config?.base_url || modelClient.config?.baseUrl || "API Configured";
  const provider = modelClient.provider || "API Provider";

  return [
    {
      id: "api-model",
      name: model,
      provider,
      model,
      baseUrl,
      description: `${provider} - ${model}`,
    },
  ];
}

interface AgentInspectorModelSectionProps {
  modelClient: AgentInspectorModelClientRaw | undefined;
  onModelSelect?: (config: ModelOption) => void;
}

/**
 * "Configure Model" section. The Vite original auto-selected the first
 * model option via a `useEffect` keyed on `modelConfigs`; here the default
 * selection is a pure render-time derivation (`activeId` falls back to
 * the first option whenever the current selection isn't in the list),
 * seeded once via lazy `useState` — the parent remounts this section with
 * `key={agentKey}` per agent, so that seed is naturally fresh per agent
 * without an effect (see `.cursor/skills/sans-effect`).
 */
export function AgentInspectorModelSection({
  modelClient,
  onModelSelect,
}: AgentInspectorModelSectionProps) {
  const modelOptions = useMemo(() => buildModelOptions(modelClient), [modelClient]);
  const [selectedId, setSelectedId] = useState<string>(() => modelOptions[0]?.id ?? "");
  const activeId = modelOptions.some((option) => option.id === selectedId)
    ? selectedId
    : (modelOptions[0]?.id ?? "");

  const handleSelect = (option: ModelOption) => {
    setSelectedId(option.id);
    onModelSelect?.(option);
  };

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Configure Model</h3>
      </header>

      {modelOptions.length === 0 ? (
        <p className={styles.modelEmpty}>No model client configured for this agent yet.</p>
      ) : (
        <div className={styles.modelsGrid}>
          {modelOptions.map((option) => {
            const Icon = providerIcon(option.provider);
            const selected = activeId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                className={cn(styles.modelCard, selected && styles.modelSelected)}
                aria-pressed={selected}
                onClick={() => handleSelect(option)}
              >
                <div className={styles.modelIconWrap}>
                  <Icon className={styles.modelIcon} aria-hidden="true" />
                </div>
                <div className={styles.modelMeta}>
                  <div className={styles.modelName}>{option.name}</div>
                  <div className={styles.modelProvider}>{option.provider}</div>
                  <div className={styles.modelDesc}>{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AgentInspectorModelSection;
