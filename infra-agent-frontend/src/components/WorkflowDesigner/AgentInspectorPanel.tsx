"use client";

import { useState, type ChangeEvent } from "react";
import Image from "next/image";
import { Cpu } from "lucide-react";
import { getAvatar } from "@/lib/avatars";
import { useGetToolCatalogQuery } from "@/features/workflows/workflowsApi";
import { FloatingPanel } from "./FloatingPanel";
import { AgentInspectorModelSection } from "./AgentInspectorModelSection";
import { AgentInspectorToolsSection } from "./AgentInspectorToolsSection";
import { AgentInspectorKnowledgeSection } from "./AgentInspectorKnowledgeSection";
import { AgentInspectorCronSection } from "./AgentInspectorCronSection";
import { cn } from "@/lib/utils";
import styles from "./AgentInspectorPanel.module.css";
import type {
  AgentInspectorAgent,
  AgentInspectorKnowledgeFile,
  AgentInspectorPanelProps,
  CronJobConfig,
} from "./AgentInspectorPanel.types";

const EMPTY_CRON_CONFIG: CronJobConfig = { interval: "", query: "" };
const EMPTY_SELECTED_TOOLS: string[] = [];
const EMPTY_KNOWLEDGE_FILES: AgentInspectorKnowledgeFile[] = [];

interface AgentInspectorContentProps {
  agent: AgentInspectorAgent;
  selectedTools: string[];
  onToolToggle?: (toolType: string) => void;
  onModelSelect?: AgentInspectorPanelProps["onModelSelect"];
  userInstructions: string;
  knowledgeFiles: AgentInspectorKnowledgeFile[];
  cronJobConfig: CronJobConfig;
  onUserInstructionsChange?: (instructions: string) => void;
  onFileUpload?: (files: File[]) => void;
  onFileDelete?: (fileId: string) => void;
  onCronJobConfigChange?: (config: CronJobConfig) => void;
}

/**
 * The panel's actual content, remounted (via `key={agentKey}` in the
 * default export below) every time a genuinely different agent is
 * selected. This gives every section's local state — the tools
 * selection's seed snapshot, the model section's default pick, the
 * instructions textarea, the cron inputs — a clean per-agent reset for
 * free (Pattern 5 of `.cursor/skills/sans-effect`), instead of each one
 * needing its own `useEffect` watching `selectedAgent`.
 */
function AgentInspectorContent({
  agent,
  selectedTools,
  onToolToggle,
  onModelSelect,
  userInstructions,
  knowledgeFiles,
  cronJobConfig,
  onUserInstructionsChange,
  onFileUpload,
  onFileDelete,
  onCronJobConfigChange,
}: AgentInspectorContentProps) {
  const { data: catalog } = useGetToolCatalogQuery();
  const [instructions, setInstructions] = useState(userInstructions);

  const avatarSrc = getAvatar(agent.label);

  const handleInstructionsChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setInstructions(value);
    onUserInstructionsChange?.(value);
  };

  return (
    <div className={styles.container}>
      {/* Resume / Info */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Resume</h3>
        </header>
        <div className={styles.resumeCard}>
          <div className={styles.resumeHead}>
            <div className={styles.resumeAvatar}>
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt=""
                  width={40}
                  height={40}
                  className={styles.resumeAvatarImg}
                  decoding="async"
                />
              ) : (
                <Cpu className={styles.resumeIcon} aria-hidden="true" />
              )}
            </div>
            <div className={styles.resumeTitleBlock}>
              <div className={styles.resumeTitle}>{agent.label}</div>
              {agent.tagline && <div className={styles.resumeTagline}>{agent.tagline}</div>}
            </div>
          </div>

          {agent.description && <p className={styles.resumeDesc}>{agent.description}</p>}

          {(agent.capabilities?.length ?? 0) > 0 && (
            <>
              <div className={styles.subheader}>Capabilities</div>
              <ul className={styles.bulletList}>
                {agent.capabilities?.map((capability) => (
                  <li key={capability}>
                    <span className={styles.dot} aria-hidden="true" />
                    {capability}
                  </li>
                ))}
              </ul>
            </>
          )}

          {(agent.strengths?.length ?? 0) > 0 && (
            <>
              <div className={styles.subheader}>Strengths</div>
              <ul className={styles.bulletList}>
                {agent.strengths?.map((strength) => (
                  <li key={strength}>
                    <span className={styles.dot} aria-hidden="true" />
                    {strength}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <AgentInspectorModelSection modelClient={agent.modelClient} onModelSelect={onModelSelect} />

      <AgentInspectorToolsSection
        agentTools={agent.tools}
        selectedTools={selectedTools}
        categories={catalog?.categories ?? []}
        onToolToggle={onToolToggle}
      />

      {/* User Instructions */}
      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>User Instructions</h3>
          <div className={styles.sectionHint}>Custom instructions for this agent</div>
        </header>
        <div className={styles.instructionsContainer}>
          <textarea
            className={styles.instructionsTextarea}
            placeholder="Add custom instructions for this agent..."
            value={instructions}
            onChange={handleInstructionsChange}
            rows={4}
            aria-label="Custom instructions for this agent"
          />
        </div>
      </section>

      <AgentInspectorKnowledgeSection
        files={knowledgeFiles}
        onFileUpload={onFileUpload}
        onFileDelete={onFileDelete}
      />

      <AgentInspectorCronSection
        cronJobConfig={cronJobConfig}
        onCronJobConfigChange={onCronJobConfigChange}
      />
    </div>
  );
}

/**
 * Floating side panel for inspecting/editing a selected Workflow Designer
 * canvas agent: description/capabilities/strengths (Resume), model client
 * selection, tool selection (from the live tool catalog), free-text user
 * instructions, knowledge bank file uploads, and cron job scheduling.
 *
 * Decomposed from the Vite original's single 1245-LOC file into this
 * orchestrator plus `AgentInspectorModelSection`, `AgentInspectorToolsSection`
 * (+ `useAgentInspectorToolSelection`), `AgentInspectorKnowledgeSection`, and
 * `AgentInspectorCronSection` — each a real render/logic seam from the
 * original's section boundaries. ServiceNow/ITSM credentials management
 * (the original's final section) was intentionally dropped: it depends on
 * per-team RTK Query hooks (`useGetAgentServiceNowCredentialsQuery` etc.)
 * that belong to the Teams feature slice (Phase 11), not yet ported, and
 * isn't part of this phase's listed scope.
 */
export function AgentInspectorPanel({
  selectedAgent,
  selectedTools = EMPTY_SELECTED_TOOLS,
  onToolToggle,
  onModelSelect,
  onClose,
  userInstructions = "",
  knowledgeFiles = EMPTY_KNOWLEDGE_FILES,
  cronJobConfig = EMPTY_CRON_CONFIG,
  onUserInstructionsChange,
  onFileUpload,
  onFileDelete,
  onCronJobConfigChange,
  onPanelRef,
}: AgentInspectorPanelProps) {
  if (!selectedAgent) {
    return null;
  }

  const agentKey = selectedAgent.nodeId ?? selectedAgent.type ?? selectedAgent.label ?? "agent";

  return (
    <div ref={onPanelRef}>
      <FloatingPanel
        position="right-top"
        size="large"
        title="Agent Inspector"
        collapsible={false}
        onClose={onClose}
        className={cn(styles.fullHeight, styles.belowActions, styles.slideIn)}
        dynamicPosition={{ toolsCollapsed: true, modelClientCollapsed: true }}
      >
        <AgentInspectorContent
          key={agentKey}
          agent={selectedAgent}
          selectedTools={selectedTools}
          onToolToggle={onToolToggle}
          onModelSelect={onModelSelect}
          userInstructions={userInstructions}
          knowledgeFiles={knowledgeFiles}
          cronJobConfig={cronJobConfig}
          onUserInstructionsChange={onUserInstructionsChange}
          onFileUpload={onFileUpload}
          onFileDelete={onFileDelete}
          onCronJobConfigChange={onCronJobConfigChange}
        />
      </FloatingPanel>
    </div>
  );
}

export default AgentInspectorPanel;
