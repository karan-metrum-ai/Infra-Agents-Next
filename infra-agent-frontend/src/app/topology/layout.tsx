import { AuthGuard } from "@/components/AuthGuard/AuthGuard";
import { AppPageShell } from "@/components/AppPageShell/AppPageShell";

export default function TopologyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppPageShell title="Infrastructure Topology">{children}</AppPageShell>
    </AuthGuard>
  );
}
