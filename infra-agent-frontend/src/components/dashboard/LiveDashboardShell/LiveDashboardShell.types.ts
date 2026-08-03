import type { ReactNode } from "react";

export interface LiveDashboardShellProps {
  children: ReactNode;
  /** Shown next to the logo. Defaults to "Dashboard" for the /dashboard/live/* tabs. */
  title?: string;
}
