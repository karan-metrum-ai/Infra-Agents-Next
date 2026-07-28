import { AuthGuard } from "@/components/AuthGuard/AuthGuard";

export default function DigitalTwinLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
