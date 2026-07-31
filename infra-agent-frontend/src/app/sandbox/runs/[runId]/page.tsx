import { SandboxRunView } from "@/components/SandboxPanel/SandboxRunView";

export default async function SandboxRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return <SandboxRunView runId={runId} />;
}
