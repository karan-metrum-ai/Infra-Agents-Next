/**
 * Report cover block (title/eyebrow/subtitle). Ported from the Vite app's
 * `components/ReportBuilder/sections/CoverSection.tsx`. Pure presentational.
 */

import type { SectionRenderProps } from "./registry";
import styles from "./CoverSection.module.css";

export default function CoverSection({ cover, theme }: SectionRenderProps) {
  if (!cover) return null;

  return (
    <div
      className={styles.coverSection}
      style={{
        borderColor: theme.primary,
        background: `linear-gradient(135deg, ${theme.primary}22, transparent)`,
      }}
    >
      <span className={styles.coverEyebrow}>{cover.eyebrow}</span>
      {cover.subtitle && <p className={styles.coverSubtitle}>{cover.subtitle}</p>}
    </div>
  );
}
