import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard/AuthGuard";
import styles from "./layout.module.css";

/**
 * Shared Command Center chrome across the three /dashboard/live tabs.
 * The real nav (CenterNavPanel, globe, cluster/team selector) lands in
 * Phase 5 — this preserves the nested-layout structure now.
 */
export default function LiveDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className={styles.shell}>
        <nav className={styles.nav}>
          <Link href="/dashboard/live/hardware">Hardware</Link>
          <Link href="/dashboard/live/teams">Teams</Link>
          <Link href="/dashboard/live/reports">Reports</Link>
        </nav>
        <div className={styles.content}>{children}</div>
      </div>
    </AuthGuard>
  );
}
