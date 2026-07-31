/**
 * Formatted free-text content block. Ported from the Vite app's
 * `components/ReportBuilder/sections/RichTextSection.tsx`. Pure presentational.
 */

import type { SectionRenderProps } from "./registry";
import styles from "./RichTextSection.module.css";

export default function RichTextSection({ section, theme }: SectionRenderProps) {
  const content =
    (section.config?.content as string | undefined) || "Add your formatted text content here.";

  return (
    <div className={styles.sectionBlock}>
      <h3 className={styles.sectionTitle} style={{ color: theme.primary }}>
        {section.title}
      </h3>
      <div className={styles.richTextContent}>{content}</div>
    </div>
  );
}
