import { KyaiPlaygroundRoute } from "@/components/KyaiPlayground/KyaiPlaygroundRoute";

export default async function KyaiSessionPage({
  params,
}: {
  params: Promise<{ correlationId: string }>;
}) {
  const { correlationId } = await params;
  return <KyaiPlaygroundRoute correlationId={correlationId} />;
}
