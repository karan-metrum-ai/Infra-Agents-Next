"use client";

import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getLinkDisplayText, isSafeLinkHref, normalizeLinkHref } from "@/utils/linkUtils";
import { processTraceContent, type ContentContext } from "./traceContentPipeline";
import styles from "./MarkdownRenderer.module.css";

/**
 * Partial pull-forward of Vite's `components/QueryTrace/MarkdownRenderer.tsx`
 * — not on this Phase 8 slice's original file list, but every content-bearing
 * block (`TextBlock`, `ReasoningBlock`, `ToolBlock`, `SubAgentBlock`,
 * `ThinkingAccordion`) depends on it directly. Reconcile with the rest of
 * `components/QueryTrace/**` as later Phase 8 passes land.
 *
 * react-markdown v10 removed the `inline` prop from the `code` renderer
 * (there is no reliable inline/block signal from rehype alone anymore) —
 * `rehype-highlight` only adds a `className` to fenced/block code, never to
 * inline `code` spans, so presence of `className` is used as the block/
 * inline signal instead.
 */
interface MarkdownRendererProps {
  content: string;
  /** If true, preprocesses content (JSON detection, link formatting). */
  preprocess?: boolean;
  /** Content context — when provided, runs through traceContentPipeline. */
  context?: ContentContext;
  /** True while the block is actively streaming. */
  streaming?: boolean;
}

const components: Components = {
  table: ({ children }) => (
    <div className={styles.tableWrapper}>
      <table className={styles.markdownTable}>{children}</table>
    </div>
  ),
  th: ({ children }) => <th className={styles.tableHeader}>{children}</th>,
  td: ({ children }) => <td className={styles.tableCell}>{children}</td>,
  pre: ({ children }) => <pre className={styles.codeBlockWrapper}>{children}</pre>,
  code: ({ className, children, ...rest }) => {
    if (className) {
      return (
        <code className={`${styles.codeBlock} ${className}`} {...rest}>
          {children}
        </code>
      );
    }
    return (
      <code className={styles.inlineCode} {...rest}>
        {children}
      </code>
    );
  },
  h1: ({ children }) => <h1 className={styles.mdHeading1}>{children}</h1>,
  h2: ({ children }) => <h2 className={styles.mdHeading2}>{children}</h2>,
  h3: ({ children }) => <h3 className={styles.mdHeading3}>{children}</h3>,
  h4: ({ children }) => <h4 className={styles.mdHeading4}>{children}</h4>,
  ul: ({ children }) => <ul className={styles.mdList}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.mdList}>{children}</ol>,
  li: ({ children }) => <li className={styles.mdListItem}>{children}</li>,
  p: ({ children }) => <p className={styles.mdParagraph}>{children}</p>,
  a: ({ children, href }) => {
    const originalText = String(children).trim();
    const displayText = getLinkDisplayText(href ?? "", originalText);

    if (!href || !isSafeLinkHref(href)) {
      return <span className={styles.mdLink}>{displayText}</span>;
    }

    const resolvedHref = normalizeLinkHref(href);

    return (
      <a
        href={resolvedHref}
        className={styles.mdLink}
        target="_blank"
        rel="noopener noreferrer"
        title={resolvedHref}
      >
        {displayText}
      </a>
    );
  },
  blockquote: ({ children }) => <blockquote className={styles.mdBlockquote}>{children}</blockquote>,
  hr: () => <hr className={styles.mdHorizontalRule} />,
  strong: ({ children }) => <strong className={styles.mdStrong}>{children}</strong>,
  em: ({ children }) => <em className={styles.mdEmphasis}>{children}</em>,
};

/**
 * Renders markdown content with proper parsing, syntax highlighting, and
 * styling. Handles JSON strings, links, and escaped content automatically.
 *
 * When `preprocess` is true, content runs through the unified pipeline.
 * Use `context` to select a profile; otherwise `agent_response` is used.
 */
function MarkdownRenderer({
  content,
  preprocess = true,
  context,
  streaming = false,
}: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    if (!content) return "";
    if (!preprocess) {
      return content;
    }
    const profile = context ?? "agent_response";
    return processTraceContent(content, { context: profile, streaming }).markdown;
  }, [content, preprocess, context, streaming]);

  return (
    <div className={styles.markdownContent}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
