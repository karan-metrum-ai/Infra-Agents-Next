import type { CurrentPhaseStatus, PredefinedPrompt } from "./EvaluationModal.types";

/** Quick-start prompts shown on the team/prompt selection screen. Ported
 * verbatim from the Vite `EvaluationModal.tsx` — copy is product content,
 * not something this migration should rewrite. */
export const PREDEFINED_PROMPTS: PredefinedPrompt[] = [
  {
    id: "server-status-report",
    title: "Server Status Report",
    description: "Monitor all servers, identify issues, and generate a comprehensive status report",
    prompt:
      "Monitor the status of all servers and check if any issues are detected. Generate a comprehensive report summarizing the health and status of each server, including any anomalies or problems found.",
  },
  {
    id: "health-logs-troubleshoot",
    title: "Health Check & Troubleshooting",
    description: "Check server health and logs, then troubleshoot any issues found",
    prompt:
      "Check the health and logs of the server to identify any issues. If any problems are detected, perform troubleshooting to diagnose and resolve the issues found.",
  },
  {
    id: "provisioned-server-monitor",
    title: "Provisioned Server Monitoring",
    description: "Get status of provisioned servers and monitor their health",
    prompt:
      "Provide the status of all provisioned servers and continuously monitor their health. Report on the current state, resource utilization, and any health concerns for the provisioned infrastructure.",
  },
  {
    id: "provision-and-status",
    title: "Server Provisioning",
    description: "Provision a new server with default template and report its status",
    prompt:
      "Provision a new server using the default template configuration. Once provisioning is complete, provide a detailed status report including the server details, configuration applied, and current operational state.",
  },
];

/** Team cards shown per page on the team-selection screen. */
export const TEAMS_PER_PAGE = 4;

/** Default phase status before any SSE status update has arrived, and the
 * fallback shown while a by-`correlationId` evaluation is still loading. */
export const INITIAL_PHASE_STATUS: CurrentPhaseStatus = {
  phase: "setup",
  title: "Initializing KYAI",
  description: "Preparing intelligent evaluation environment",
  progress: 0,
  isActive: true,
  isComplete: false,
  hasError: false,
};

/** Terminal phase status once a trajectory has been loaded/derived, for
 * either the live-stream or by-`correlationId` viewing flow. */
export const COMPLETE_PHASE_STATUS: CurrentPhaseStatus = {
  phase: "complete",
  title: "KYAI Analysis Complete",
  description: "Intelligent evaluation finished successfully",
  progress: 100,
  isActive: false,
  isComplete: true,
  hasError: false,
};

/** Human-readable descriptions for each SSE `status` value the evaluation
 * stream can report. */
export const STATUS_DESCRIPTIONS: Record<string, string> = {
  creating_team: "Configuring AI agent team architecture and roles",
  team_created: "Agent team successfully initialized and ready",
  uploading_knowledge_bank: "Loading domain knowledge, tools, and capabilities into agent memory",
  deploying_team: "Provisioning infrastructure and deploying agents to evaluation environment",
  deployment_started: "Beginning distributed deployment process",
  checking_deployment: "Performing health checks and validating agent readiness",
  deployment_in_progress: "Deploying agents across evaluation infrastructure",
  deployment_successful: "All agents deployed and operational",
  waiting_before_interaction: "Stabilizing environment before task execution",
  starting_session: "Initializing interactive evaluation session",
  session_started: "Evaluation session active - agents receiving task",
  monitoring_session: "Tracking real-time agent performance, coordination, and decision-making",
  session_ongoing: "Agents actively processing and executing assigned tasks",
  session_complete: "Task execution completed - collecting final outputs",
  evaluation_complete: "Deep performance analysis and intelligent scoring complete",
};
