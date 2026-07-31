"use client";

import { useCallback, useState } from "react";
import { useMountEffect } from "./useMountEffect";

export type OnboardingStep = "discovery" | "topology" | "workflows" | "complete";

export interface OnboardingState {
  discoveryComplete: boolean;
  topologyComplete: boolean;
  workflowsComplete: boolean;
  completedAt: string | null;
  lastVisitedStep: OnboardingStep | null;
}

const ONBOARDING_STORAGE_KEY = "metrum_onboarding_status";

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  discoveryComplete: false,
  topologyComplete: false,
  workflowsComplete: false,
  completedAt: null,
  lastVisitedStep: null,
};

function loadOnboardingState(): OnboardingState {
  try {
    const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof parsed.discoveryComplete === "boolean" &&
        typeof parsed.topologyComplete === "boolean" &&
        typeof parsed.workflowsComplete === "boolean"
      ) {
        return parsed as OnboardingState;
      }
    }
  } catch {
    // fall through to default
  }
  return DEFAULT_ONBOARDING_STATE;
}

function saveOnboardingState(state: OnboardingState): void {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private browsing, quota) — non-fatal
  }
}

/**
 * Tracks onboarding progress (Login -> Onboarding -> Digital Twin -> Workflows
 * -> Dashboard) in localStorage so the post-login redirect resumes wherever
 * the user left off.
 *
 * Sans-effect: the Vite original had 2 direct `useEffect` calls -- one
 * reading `localStorage` on mount into state, one re-saving state on every
 * change after that initial load. The mount-time read is a genuine external
 * sync (Pattern 4, `useMountEffect`); the save-on-change effect is
 * eliminated entirely (Pattern 3) since every state mutation already goes
 * through one of this hook's own setters below -- each setter now persists
 * the computed next state itself, right where it's produced, instead of
 * a separate effect watching for the change.
 */
export function useOnboardingStatus() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [isLoading, setIsLoading] = useState(true);

  useMountEffect(() => {
    setState(loadOnboardingState());
    setIsLoading(false);
  });

  const isOnboardingComplete = useCallback((): boolean => {
    return state.completedAt !== null || state.workflowsComplete;
  }, [state.completedAt, state.workflowsComplete]);

  const isStepComplete = useCallback(
    (step: OnboardingStep): boolean => {
      switch (step) {
        case "discovery":
          return state.discoveryComplete;
        case "topology":
          return state.topologyComplete;
        case "workflows":
          return state.workflowsComplete;
        case "complete":
          return isOnboardingComplete();
        default:
          return false;
      }
    },
    [state, isOnboardingComplete],
  );

  /** Flow: /onboarding -> /digital-twin -> /workflows -> /dashboard/live */
  const getNextStep = useCallback((): string => {
    if (!state.discoveryComplete) return "/onboarding";
    if (!state.topologyComplete) return "/digital-twin";
    if (!state.workflowsComplete) return "/workflows";
    return "/dashboard/live";
  }, [state]);

  const getPostLoginRedirect = useCallback((): string => {
    return isOnboardingComplete() ? "/dashboard/live" : getNextStep();
  }, [isOnboardingComplete, getNextStep]);

  const markStepComplete = useCallback((step: OnboardingStep): void => {
    setState((prev) => {
      const next = { ...prev, lastVisitedStep: step };
      switch (step) {
        case "discovery":
          next.discoveryComplete = true;
          break;
        case "topology":
          next.topologyComplete = true;
          break;
        case "workflows":
          next.workflowsComplete = true;
          break;
        case "complete":
          next.discoveryComplete = true;
          next.topologyComplete = true;
          next.workflowsComplete = true;
          next.completedAt = new Date().toISOString();
          break;
      }
      saveOnboardingState(next);
      return next;
    });
  }, []);

  const markOnboardingComplete = useCallback((): void => {
    setState((prev) => {
      const next = {
        ...prev,
        discoveryComplete: true,
        topologyComplete: true,
        workflowsComplete: true,
        completedAt: new Date().toISOString(),
      };
      saveOnboardingState(next);
      return next;
    });
  }, []);

  const resetOnboarding = useCallback((): void => {
    setState(DEFAULT_ONBOARDING_STATE);
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // storage unavailable — non-fatal
    }
  }, []);

  const getProgressPercentage = useCallback((): number => {
    let completed = 0;
    if (state.discoveryComplete) completed++;
    if (state.topologyComplete) completed++;
    if (state.workflowsComplete) completed++;
    return Math.round((completed / 3) * 100);
  }, [state]);

  return {
    state,
    isLoading,
    isOnboardingComplete,
    isStepComplete,
    getNextStep,
    getPostLoginRedirect,
    getProgressPercentage,
    markStepComplete,
    markOnboardingComplete,
    resetOnboarding,
  };
}
