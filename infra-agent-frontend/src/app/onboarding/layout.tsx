import { AuthGuard } from "@/components/AuthGuard/AuthGuard";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRoles={["platform_admin"]}>{children}</AuthGuard>;
}
