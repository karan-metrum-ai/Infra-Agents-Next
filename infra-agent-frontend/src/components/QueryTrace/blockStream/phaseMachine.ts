/**
 * Phase state machine for the PRD `agent_frame` lifecycle.
 *
 * Encodes the State Transition Logic Matrix from §5 of the PRD as a
 * data table so UI components can render the correct affordance for
 * each phase without spreading conditional logic everywhere.
 *
 * The matrix:
 *
 *   phase                  | affordance                | tone     | locked?
 *   -----------------------|---------------------------|----------|--------
 *   idle                   | skeleton (pre-stream)     | neutral  | false
 *   planning               | skeleton + todo init      | progress | false
 *   executing              | streaming logs + cursor   | progress | false
 *   verification           | scoring overlay           | progress | false
 *   interruption_awaited   | halted, mount overlay     | warning  | true
 *   completed              | summary + checks          | success  | true
 *   failed                 | error banner              | error    | true
 */
import type { Phase } from "./types";

export type PhaseTone = "neutral" | "progress" | "warning" | "success" | "error";

export interface PhaseDescriptor {
  /** Short human-readable label. */
  label: string;
  /** Long-form description for tooltips / aria labels. */
  description: string;
  /** Color/tone bucket — drives badge styling. */
  tone: PhaseTone;
  /** Whether the renderer should disable interactions / fade affordances. */
  locked: boolean;
  /** Whether to keep the streaming cursor visible. */
  isStreaming: boolean;
  /** Whether to mount the interruption overlay. */
  showInterruption: boolean;
}

const DESCRIPTORS: Record<Phase, PhaseDescriptor> = {
  idle: {
    label: "Connecting",
    description: "Waiting for the first agent_frame event from the server.",
    tone: "neutral",
    locked: false,
    isStreaming: false,
    showInterruption: false,
  },
  planning: {
    label: "Planning",
    description: "Agent is decomposing the request into a structured todo list.",
    tone: "progress",
    locked: false,
    isStreaming: true,
    showInterruption: false,
  },
  executing: {
    label: "Executing",
    description: "Agent is running tools and producing block updates.",
    tone: "progress",
    locked: false,
    isStreaming: true,
    showInterruption: false,
  },
  verification: {
    label: "Verifying",
    description: "Agent is reviewing its own work before completion.",
    tone: "progress",
    locked: false,
    isStreaming: true,
    showInterruption: false,
  },
  interruption_awaited: {
    label: "Awaiting confirmation",
    description: "The agent reached a checkpoint and is waiting for your decision.",
    tone: "warning",
    locked: true,
    isStreaming: false,
    showInterruption: true,
  },
  completed: {
    label: "Completed",
    description: "Flow finished successfully.",
    tone: "success",
    locked: true,
    isStreaming: false,
    showInterruption: false,
  },
  failed: {
    label: "Failed",
    description: "Flow terminated with an error.",
    tone: "error",
    locked: true,
    isStreaming: false,
    showInterruption: false,
  },
};

/** Resolve UI affordances for a phase. Pure / deterministic. */
export function describePhase(phase: Phase): PhaseDescriptor {
  return DESCRIPTORS[phase] ?? DESCRIPTORS.idle;
}

/**
 * Valid transitions per the PRD matrix. The reducer does not enforce
 * these — the server is the source of truth — but consumers can use
 * `isValidTransition` to drop spurious transitions during reconnect.
 */
const VALID_TRANSITIONS: Record<Phase, Phase[]> = {
  idle: ["planning", "executing", "failed"],
  planning: ["executing", "interruption_awaited", "failed"],
  executing: ["verification", "interruption_awaited", "completed", "failed"],
  verification: ["completed", "failed", "executing"],
  interruption_awaited: ["executing", "completed", "failed"],
  completed: [],
  failed: [],
};

/** True if `next` is a valid successor for `current`. */
export function isValidTransition(current: Phase, next: Phase): boolean {
  if (current === next) return true;
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}
