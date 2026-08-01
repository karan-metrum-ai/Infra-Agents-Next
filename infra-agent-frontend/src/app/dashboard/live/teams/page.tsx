import { TeamsDashboard } from "@/components/dashboard/TeamsDashboard/TeamsDashboard";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  return <TeamsDashboard clusterId={cluster ?? null} />;
}
