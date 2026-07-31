/**
 * Image section placeholder. Ported from the Vite app's
 * `components/ReportBuilder/sections/ImageSection.tsx`. Pure presentational.
 */

import { ImageIcon } from "lucide-react";
import type { SectionRenderProps } from "./registry";
import styles from "./ImageSection.module.css";

export default function ImageSection({ section, theme }: SectionRenderProps) {
  const alt = (section.config?.alt as string | undefined) || "Report image";

  return (
    <div className={styles.sectionBlock}>
      <h3 className={styles.sectionTitle} style={{ color: theme.primary }}>
        {section.title}
      </h3>
      <div className={styles.imagePlaceholder} style={{ borderColor: `${theme.primary}44` }}>
        <ImageIcon size={32} style={{ color: theme.primary }} />
        <span>{alt}</span>
      </div>
    </div>
  );
}
