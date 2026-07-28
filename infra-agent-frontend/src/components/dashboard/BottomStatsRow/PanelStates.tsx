import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import styles from "./BottomStatsRow.module.css";

interface PanelEmptyProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
}

export function PanelEmpty({ icon, title, subtitle }: PanelEmptyProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon} aria-hidden="true">
        {icon}
      </div>
      <span className={styles.emptyTitle}>{title}</span>
      {subtitle && <span className={styles.emptySubtitle}>{subtitle}</span>}
    </div>
  );
}

export function PanelLoading({ message }: { message: string }) {
  return (
    <output className={styles.emptyState}>
      <Loader2 size={18} className={styles.spinner} aria-hidden="true" />
      <span className={styles.emptyTitle}>{message}</span>
    </output>
  );
}
