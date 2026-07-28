import { AuthGuard } from "@/components/AuthGuard/AuthGuard";

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["platform_admin", "infra_admin"]}>{children}</AuthGuard>;
}
