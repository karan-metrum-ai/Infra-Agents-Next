import { AuthGuard } from "@/components/AuthGuard/AuthGuard";
import { AppPageShell } from "@/components/AppPageShell/AppPageShell";

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={["platform_admin", "infra_admin"]}>
      <AppPageShell title="Sandbox">{children}</AppPageShell>
    </AuthGuard>
  );
}
