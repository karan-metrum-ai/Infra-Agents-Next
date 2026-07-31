/**
 * Executive-summary narrative block. Ported from the Vite app's
 * `components/ReportBuilder/sections/SummarySection.tsx`. Pure presentational.
 */

import type { SectionRenderProps } from "./registry";
import styles from "./SummarySection.module.css";

const MOCK_SUMMARY =
  "Infrastructure telemetry shows stable performance across " +
  "monitored systems. Power consumption remains within expected " +
  "ranges with minor fluctuations in CPU utilization during peak " +
  "hours. No critical alerts were triggered during the reporting " +
  "period.";

export default function SummarySection({ section, theme }: SectionRenderProps) {
  const content = (section.config?.content as string | undefined) || MOCK_SUMMARY;

  return (
    <div className={styles.sectionBlock}>
      <h3 className={styles.sectionTitle} style={{ color: theme.primary }}>
        {section.title}
      </h3>
      <p className={styles.summaryText}>{content}</p>
    </div>
  );
}
