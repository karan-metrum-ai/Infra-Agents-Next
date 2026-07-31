/**
 * Custom / flexible content block. Ported from the Vite app's
 * `components/ReportBuilder/sections/CustomSection.tsx`. Pure presentational.
 */

import type { SectionRenderProps } from "./registry";
import styles from "./CustomSection.module.css";

export default function CustomSection({ section, theme }: SectionRenderProps) {
  const content =
    (section.config?.content as string | undefined) ||
    "Custom section — configure content in the properties panel.";

  return (
    <div
      className={styles.sectionBlock}
      style={{ borderStyle: "dashed", borderColor: `${theme.primary}55` }}
    >
      <h3 className={styles.sectionTitle} style={{ color: theme.primary }}>
        {section.title}
      </h3>
      <p className={styles.summaryText}>{content}</p>
    </div>
  );
}
