"use client";

/**
 * Chat input for submitting queries to a deployed agent team — the input
 * half of `TeamsDashboard`'s middle panel.
 *
 * Trimmed from the Vite source's `ChatPanel.tsx`: this app has no agent
 * catalog wired up for `@`-mention yet, so the entire mention popup/
 * direct-agent-call code path (only ever reachable when a caller passes
 * `mentionableAgents`, which nothing here does) was dropped rather than
 * ported as unreachable code. Re-add `AgentMentionPopup` if/when a real
 * mentionable-agents source exists.
 */

import { useRef } from "react";
import { SendHorizontal } from "lucide-react";
import { Kbd } from "@/components/ui/Kbd/Kbd";
import { useMountEffect } from "@/hooks/useMountEffect";
import { cn } from "@/lib/utils";
import styles from "./ChatPanel.module.css";
import type { ChatPanelProps } from "./ChatPanel.types";

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function ChatPanel({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask your AI agents about infrastructure status, diagnostics, or operations...",
  disabled = false,
  className,
  embedded = false,
}: ChatPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useMountEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const modifierKey = isMac() ? event.metaKey : event.ctrlKey;
      if (modifierKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (!query || disabled) return;
    onSubmit(query);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  /** Auto-resize on every change, right in the handler that causes it — no effect needed. */
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  return (
    <div className={cn(styles.chatPanelWrapper, embedded && styles.chatPanelEmbedded, className)}>
      <form onSubmit={handleSubmit} className={styles.chatForm}>
        <div className={styles.chatInputContainer}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={styles.chatInput}
            disabled={disabled}
            rows={1}
          />

          {!value && (
            <Kbd
              keys={isMac() ? ["⌘", "K"] : ["Ctrl", "K"]}
              className={styles.shortcutHint}
              title={`Press ${isMac() ? "Cmd" : "Ctrl"}+K to focus`}
            />
          )}

          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className={styles.sendButton}
            aria-label="Send message"
          >
            <SendHorizontal className={styles.sendIcon} aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatPanel;
