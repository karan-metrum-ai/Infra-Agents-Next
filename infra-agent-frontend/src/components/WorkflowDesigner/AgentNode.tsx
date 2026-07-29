"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { Handle, Position } from "@xyflow/react";
import { Info, Settings, Zap } from "lucide-react";
import { getAvatar, getAvatarSet, type AvatarSet } from "@/lib/avatars";
import { useMountEffect } from "@/hooks/useMountEffect";
import { cn } from "@/lib/utils";
import styles from "./AgentNode.module.css";
import type { AgentNodeProps, AgentStatus } from "./AgentNode.types";

const FALLBACK_AVATAR_BY_SET: Record<AvatarSet, string> = {
  1: "/agents/Operations Manager.webp",
  2: "/agents/operations-manager.webp",
};

function statusChrome(status: AgentStatus): string {
  switch (status) {
    case "running":
      return styles.borderRunning;
    case "completed":
      return styles.borderCompleted;
    case "error":
      return styles.borderError;
    default:
      return styles.borderDefault;
  }
}

function statusDotClass(status: AgentStatus): string {
  switch (status) {
    case "running":
      return styles.dotBlue;
    case "completed":
      return styles.dotGreen;
    case "error":
      return styles.dotRed;
    default:
      return styles.dotGray;
  }
}

interface AgentAvatarProps {
  src: string;
  alt: string;
  status: AgentStatus;
  isActive?: boolean;
  apiConnected?: boolean;
}

/** Memoized so avatar re-renders only when its own five inputs change. */
const AgentAvatar = memo(
  function AgentAvatar({ src, alt, status, isActive, apiConnected }: AgentAvatarProps) {
    return (
      <div className={styles.avatarPosition}>
        <div className={styles.avatarFrame}>
          <Image
            src={src}
            alt={alt}
            width={168}
            height={168}
            className={styles.avatarImg}
            draggable={false}
            decoding="async"
          />
          <span
            aria-hidden="true"
            className={cn(
              styles.statusDot,
              statusDotClass(status),
              isActive && styles.pulsing,
              apiConnected && styles.apiConnected,
            )}
          />

          {apiConnected && (
            <div className={styles.apiIndicator} aria-hidden="true">
              <div className={styles.apiDot} />
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.src === next.src &&
    prev.alt === next.alt &&
    prev.status === next.status &&
    prev.isActive === next.isActive &&
    prev.apiConnected === next.apiConnected,
);

/**
 * Custom `@xyflow/react` node type rendering one agent card on the
 * Workflow Designer canvas: avatar, name/tagline, model/tools/config
 * chips, capability list, and a settings button that opens the (not yet
 * built) Agent Inspector side panel via `onSettingsClick`.
 */
function AgentNode({ data, id, onSettingsClick }: AgentNodeProps) {
  // Avatar set (1 or 2) is a global, cross-page user preference stored in
  // localStorage and broadcast via a `window` CustomEvent whenever it
  // changes elsewhere in the app. Subscribing to that browser-level event
  // is a genuine mount-time external-system sync — the sanctioned
  // `useMountEffect` case (see `.cursor/skills/sans-effect/SKILL.md`).
  const [avatarSet, setAvatarSet] = useState<AvatarSet>(() => getAvatarSet());

  useMountEffect(() => {
    const handleAvatarSetChange = (event: Event) => {
      const detail = (event as CustomEvent<AvatarSet>).detail;
      setAvatarSet(detail);
    };
    window.addEventListener("avatar-set-changed", handleAvatarSetChange as EventListener);
    return () => {
      window.removeEventListener("avatar-set-changed", handleAvatarSetChange as EventListener);
    };
  });

  const avatarSrc = useMemo(() => {
    const metaAvatar = data.agentMeta?.avatar;
    if (metaAvatar) return metaAvatar;
    const labelAvatar = getAvatar(data.label, avatarSet);
    if (labelAvatar) return labelAvatar;
    return FALLBACK_AVATAR_BY_SET[avatarSet];
  }, [data.label, data.agentMeta?.avatar, avatarSet]);

  const modelName = data.selectedModelClient?.name ?? data.selectedModelClient?.model ?? "";

  const toolsCount = Array.isArray(data.tools) ? data.tools.length : 0;

  const capabilities = useMemo(
    () => (Array.isArray(data.capabilities) ? data.capabilities : []),
    [data.capabilities],
  );

  const tagline = data.tagline ?? data.agentMeta?.tagline ?? "";

  const hasUserConfig = Boolean(
    data.userConfig?.userInstructions ||
    (data.userConfig?.knowledgeBank?.length ?? 0) > 0 ||
    Object.keys(data.userConfig?.customSettings ?? {}).length > 0,
  );

  const handleSettingsClick = useCallback(() => {
    const nodeId = id ?? "";
    onSettingsClick?.(nodeId, data);
  }, [id, data, onSettingsClick]);

  return (
    <div className={styles.nodeWrapper}>
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={styles.handle}
        style={{ top: "50%", left: -6, zIndex: 30 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className={styles.handle}
        style={{ top: "50%", right: -6, zIndex: 30 }}
      />

      <AgentAvatar
        src={avatarSrc}
        alt={data.label}
        status={data.status}
        isActive={data.isActive}
        apiConnected={data.apiConnected}
      />

      <div
        className={cn(
          styles.mainCard,
          styles.card,
          statusChrome(data.status),
          data.isLiveAgent && styles.liveAgentAura,
        )}
      >
        {/* Ghost aura layer: only present when this agent is currently
            working on a device. Purely decorative, so it is hidden from
            assistive tech; the same "live" state is also conveyed
            non-visually via the status dot + card border color. */}
        {data.isLiveAgent && <span className={styles.liveAgentWisp} aria-hidden="true" />}

        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <div className={styles.agentName}>{data.label}</div>

            {tagline && <div className={styles.agentTagline}>{tagline}</div>}

            <div className={styles.chipsRow}>
              {modelName && (
                <div className={styles.modelChip} title={modelName}>
                  <span className={styles.emojiMuted} aria-hidden="true">
                    🧠
                  </span>
                  <span className={styles.modelNameTrunc}>{modelName}</span>
                </div>
              )}

              <div className={styles.toolsChip}>
                <Zap size={12} aria-hidden="true" />
                <span>{toolsCount}</span>
                <span>tool{toolsCount === 1 ? "" : "s"}</span>
              </div>

              {hasUserConfig && (
                <div className={styles.configChip} title="Custom config present">
                  <Info size={12} aria-hidden="true" />
                  Configured
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSettingsClick}
            className={styles.settingsBtn}
            data-settings-button
            aria-label={hasUserConfig ? "Edit agent settings" : "Configure agent settings"}
            title={hasUserConfig ? "Edit agent settings" : "Configure agent settings"}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.rule} />

        {capabilities.length > 0 && (
          <div className={styles.capabilitiesList}>
            {capabilities.slice(0, 4).map((capability) => (
              <div key={capability} className={styles.capabilityItem}>
                <span className={styles.capabilityDot} aria-hidden="true" />
                <span className={styles.capabilityText}>{capability}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Memoized with a targeted comparator so a canvas-wide re-render (e.g. a
 * sibling node moving) doesn't re-render every agent card — only the
 * fields this component actually reads are compared.
 */
function areEqual(prev: AgentNodeProps, next: AgentNodeProps): boolean {
  if (prev.id !== next.id) return false;
  if (prev.onSettingsClick !== next.onSettingsClick) return false;

  const prevData = prev.data;
  const nextData = next.data;

  if (prevData.label !== nextData.label) return false;
  if (prevData.status !== nextData.status) return false;
  if (prevData.tagline !== nextData.tagline) return false;
  if (prevData.isActive !== nextData.isActive) return false;
  if (prevData.apiConnected !== nextData.apiConnected) return false;
  if (prevData.isLiveAgent !== nextData.isLiveAgent) return false;
  if (prevData.agentMeta?.avatar !== nextData.agentMeta?.avatar) return false;
  if (prevData.selectedModelClient?.name !== nextData.selectedModelClient?.name) return false;
  if (prevData.selectedModelClient?.model !== nextData.selectedModelClient?.model) return false;
  if (JSON.stringify(prevData.tools) !== JSON.stringify(nextData.tools)) return false;
  if (JSON.stringify(prevData.capabilities) !== JSON.stringify(nextData.capabilities)) {
    return false;
  }
  if (JSON.stringify(prevData.userConfig) !== JSON.stringify(nextData.userConfig)) return false;

  return true;
}

export default memo(AgentNode, areEqual);
