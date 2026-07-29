import type { TeamListItem } from "@/features/teams/teamsApi.types";

export type EvaluationModalLayout = "modal" | "page";

export interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided, jumps straight to the trajectory tabs for this KYAI session's correlation id. */
  correlationId?: string;
  /** 'modal' (default) renders the overlay card; 'page' renders the same content as a standalone route (used by `/kyai`). */
  layout?: EvaluationModalLayout;
}

export type EvaluationTab = "overview" | "agents" | "diagram";

export interface PredefinedPrompt {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

export interface StatusUpdate {
  status: string;
  team_id?: string;
  session_id?: string;
  current_status?: string;
  message?: string;
  timestamp?: string;
}

export interface CurrentPhaseStatus {
  phase: "setup" | "deployment" | "execution" | "analysis" | "complete";
  title: string;
  description: string;
  progress: number;
  isActive: boolean;
  isComplete: boolean;
  hasError: boolean;
}

export interface LlmScore {
  score: number;
  effectiveness: number;
  efficiency: number;
  quality: number;
  progress: number;
  reasoning: string;
}

export interface PromptUsage {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface ToolCall {
  tool: string;
  parameters: Record<string, unknown>;
  result: unknown;
}

export interface AgentStep {
  step_id: string;
  timestamp: string;
  operation: string;
  description: string;
  status: "success" | "error" | "in_progress" | "pending";
  duration_seconds: number;
  llm_score: LlmScore;
  prompt_usage: PromptUsage;
  tool_calls: ToolCall[];
}

export interface AgentData {
  agent_name: string;
  agent_role: string;
  total_steps: number;
  successful_steps: number;
  failed_steps: number;
  average_score: number;
  total_duration: number;
  steps: AgentStep[];
}

export interface OverallTaskScore {
  completion_score: number;
  task_completion: number;
  agent_coordination: number;
  resource_efficiency: number;
  error_handling: number;
  information_quality: number;
  reasoning: string;
  key_strengths: string[];
  areas_for_improvement: string[];
}

export interface TrajectoryMetadata {
  session_id: string;
  start_time: string;
  end_time: string;
  total_duration_seconds: number;
  user_request: string;
  total_spans: number;
  total_steps: number;
  llm_calls: number;
  tool_calls: number;
  total_tokens: number;
  average_step_score: number;
  agents_involved: string[];
  status_distribution: { success: number; error: number; pending: number };
  step_score_distribution: { min: number; max: number; avg: number; std: number };
  overall_task_score: OverallTaskScore;
  model_usage: Record<string, { calls: number; total_tokens: number; avg_tokens_per_call: number }>;
  tool_usage: Record<string, number>;
}

export interface TrajectoryData {
  metadata: TrajectoryMetadata;
  agents: AgentData[];
}

/** `GET /teams` row shape, reused as-is for the team-selection screen. */
export type TeamOption = TeamListItem;
