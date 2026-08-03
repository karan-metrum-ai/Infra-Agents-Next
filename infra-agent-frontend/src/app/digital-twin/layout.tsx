import { AuthGuard } from "@/components/AuthGuard/AuthGuard";
import { AppPageShell } from "@/components/AppPageShell/AppPageShell";

export default function DigitalTwinLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppPageShell title="Digital Twin">{children}</AppPageShell>
    </AuthGuard>
  );
}
