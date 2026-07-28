import { AgentTeamView } from "@/components/dashboard/AgentTeamView/AgentTeamView";

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  return <AgentTeamView clusterId={cluster ?? null} />;
}
