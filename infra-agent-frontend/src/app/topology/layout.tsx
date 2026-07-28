import { AuthGuard } from "@/components/AuthGuard/AuthGuard";

export default function TopologyLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
