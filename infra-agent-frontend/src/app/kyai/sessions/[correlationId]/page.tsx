export default async function KyaiSessionPage({
  params,
}: {
  params: Promise<{ correlationId: string }>;
}) {
  const { correlationId } = await params;
  return (
    <main>
      <h1>KyAI session {correlationId}</h1>
      <p>KyAI session replay lands in Phase 12 (KyAI Playground).</p>
    </main>
  );
}
