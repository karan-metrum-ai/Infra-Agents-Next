"use client";

import { memo, useMemo, useRef } from "react";
import MarkdownRenderer from "../MarkdownRenderer";
import styles from "./AgentTrace.module.css";

interface StreamingMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * Auto-closes dangling markdown tokens so partial text never renders broken.
 */
function autoCloseMarkdown(text: string): string {
  let result = text;

  // Close dangling triple backtick code fences
  const fenceCount = (result.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) {
    result += "\n```";
  }

  // Close dangling bold
  const boldCount = (result.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    result += "**";
  }

  // Close dangling inline code
  const backticks = (result.match(/(?<!`)`(?!`)/g) || []).length;
  if (backticks % 2 !== 0) {
    result += "`";
  }

  return result;
}

/**
 * Memoized stable prefix renderer. Only re-renders when the stable
 * prefix actually changes (which it shouldn't for finished content).
 */
const StablePrefix = memo<{ content: string }>(({ content }) => (
  <MarkdownRenderer content={content} context="agent_response" />
));
StablePrefix.displayName = "StablePrefix";

/**
 * Streaming markdown renderer that splits content into a stable prefix
 * and a volatile tail. Only the tail gets re-parsed on each frame,
 * preventing finished prose from being re-processed.
 */
function StreamingMarkdown({ content, isStreaming = false }: StreamingMarkdownProps) {
  const lastStableRef = useRef("");

  const { stableContent, tailContent } = useMemo(() => {
    if (!isStreaming || !content) {
      return { stableContent: content || "", tailContent: "" };
    }

    // Split at the last double newline — everything before it is stable
    const splitIdx = content.lastIndexOf("\n\n");
    if (splitIdx <= 0) {
      return { stableContent: lastStableRef.current, tailContent: content };
    }

    const stable = content.slice(0, splitIdx);
    const tail = content.slice(splitIdx);
    lastStableRef.current = stable;
    return { stableContent: stable, tailContent: tail };
  }, [content, isStreaming]);

  if (!content) return null;

  if (!isStreaming) {
    return <MarkdownRenderer content={content} context="agent_response" />;
  }

  const closedTail = autoCloseMarkdown(tailContent);

  return (
    <div>
      {stableContent && <StablePrefix content={stableContent} />}
      {closedTail && <MarkdownRenderer content={closedTail} context="agent_response" streaming />}
      <span className={styles.streamingCaret} />
    </div>
  );
}

export default StreamingMarkdown;
