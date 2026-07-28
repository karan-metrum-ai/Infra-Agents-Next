export default async function SandboxRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return (
    <main>
      <h1>Sandbox run {runId}</h1>
      <p>Sandbox run detail lands in Phase 9 (Sandbox / Eval Panel).</p>
    </main>
  );
}
