import { AuthGuard } from "@/components/AuthGuard/AuthGuard";
import { AppPageShell } from "@/components/AppPageShell/AppPageShell";

export default function KyaiLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={["platform_admin", "infra_admin"]}>
      <AppPageShell title="Know Your AI">{children}</AppPageShell>
    </AuthGuard>
  );
}
