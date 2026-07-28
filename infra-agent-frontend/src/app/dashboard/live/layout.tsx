import { Suspense } from "react";
import { AuthGuard } from "@/components/AuthGuard/AuthGuard";
import { LiveDashboardShell } from "@/components/dashboard/LiveDashboardShell/LiveDashboardShell";

/** Shared Command Center chrome across the three /dashboard/live tabs. */
export default function LiveDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Suspense>
        <LiveDashboardShell>{children}</LiveDashboardShell>
      </Suspense>
    </AuthGuard>
  );
}
