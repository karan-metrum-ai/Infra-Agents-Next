import type { RawTrajectoryPayload } from "@/features/kyai/kyaiApi.types";
import { COMPLETE_PHASE_STATUS, INITIAL_PHASE_STATUS } from "./evaluationModalConstants";
import { formatStatusDescription, formatStatusTitle } from "./evaluationModalFormatters";
import type {
  AgentData,
  AgentStep,
  CurrentPhaseStatus,
  StatusUpdate,
  TrajectoryData,
  TrajectoryMetadata,
} from "./EvaluationModal.types";

interface AgentLevelScoreEntry {
  total_steps?: number;
  average_score?: number;
}

type MetadataWithAgentScores = TrajectoryMetadata & {
  agent_level_scores?: Record<string, AgentLevelScoreEntry>;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function buildStep(stepKey: string, stepData: Record<string, unknown>): AgentStep {
  return {
    step_id: stepKey,
    timestamp: (stepData.timestamp as string) ?? "",
    operation: (stepData.operation as string) ?? "",
    description: (stepData.description as string) ?? "",
    status: (stepData.status as AgentStep["status"]) ?? "pending",
    duration_seconds: (stepData.duration_seconds as number) ?? 0,
    llm_score: (stepData.llm_score as AgentStep["llm_score"]) ?? {
      score: 0,
      effectiveness: 0,
      efficiency: 0,
      quality: 0,
      progress: 0,
      reasoning: "",
    },
    prompt_usage: (stepData.prompt_usage as AgentStep["prompt_usage"]) ?? {
      total_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
    },
    tool_calls: (stepData.tool_calls as AgentStep["tool_calls"]) ?? [],
  };
}

function buildAgent(
  name: string,
  agentSteps: Record<string, unknown>,
  metadata: MetadataWithAgentScores,
): AgentData {
  const agentLevelScores = metadata.agent_level_scores?.[name];
  const stepsArray = Object.entries(agentSteps).map(([stepKey, stepData]) =>
    buildStep(stepKey, toRecord(stepData)),
  );
  const successfulSteps = stepsArray.filter((step) => step.status === "success").length;
  const failedSteps = stepsArray.filter((step) => step.status === "error").length;
  const totalDuration = stepsArray.reduce((sum, step) => sum + step.duration_seconds, 0);

  return {
    agent_name: name,
    agent_role: name
      .replace(/Agent$/, "")
      .replace(/([A-Z])/g, " $1")
      .trim(),
    total_steps: agentLevelScores?.total_steps ?? stepsArray.length,
    successful_steps: successfulSteps,
    failed_steps: failedSteps,
    average_score: agentLevelScores?.average_score ?? 0,
    total_duration: totalDuration,
    steps: stepsArray,
  };
}

/**
 * Shapes the backend's dynamic (agent-name-keyed) trajectory payload into
 * the strongly-typed `TrajectoryData` the UI renders. See
 * `kyaiApi.types.ts`'s doc comment on `RawTrajectoryPayload` for why the
 * wire shape stays an untyped blob upstream of this function — the backend
 * returns one top-level key per agent plus a `metadata` key, not a fixed
 * schema.
 */
export function transformTrajectoryData(raw: RawTrajectoryPayload): TrajectoryData {
  const metadata = raw.metadata as MetadataWithAgentScores;
  const agentNames = Object.keys(raw).filter((key) => key !== "metadata");
  const agents = agentNames.map((name) => buildAgent(name, toRecord(raw[name]), metadata));
  return { metadata, agents };
}

/**
 * Pure derivation of the "what's happening right now" banner shown while a
 * live evaluation is in flight — replaces the Vite original's
 * `useEffect(() => setCurrentPhaseStatus(...), [statusUpdates])` with an
 * inline computation (see `.cursor/skills/sans-effect/SKILL.md` Pattern 1:
 * derive state, don't sync it).
 */
export function derivePhaseStatus(statusUpdates: StatusUpdate[]): CurrentPhaseStatus {
  if (statusUpdates.length === 0) return INITIAL_PHASE_STATUS;

  const hasComplete = statusUpdates.some((update) => update.status === "evaluation_complete");
  if (hasComplete) return COMPLETE_PHASE_STATUS;

  const latest = statusUpdates[statusUpdates.length - 1];
  let progress = Math.min(statusUpdates.length * 5, 95);
  if (latest.status === "session_complete") progress = 95;
  else if (latest.status.includes("session_ongoing")) progress = 80;
  else if (latest.status === "monitoring_session") progress = 75;

  return {
    phase: "execution",
    title: formatStatusTitle(latest.status),
    description: formatStatusDescription(latest),
    progress,
    isActive: true,
    isComplete: false,
    hasError: false,
  };
}
