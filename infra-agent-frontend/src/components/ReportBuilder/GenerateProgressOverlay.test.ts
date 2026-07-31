import { describe, expect, it } from "vitest";
import {
  applyStreamChartProgress,
  applyStreamStepCompleted,
  applyStreamStepStarted,
  createInitialProgressState,
} from "./GenerateProgressOverlay";

describe("generate progress state helpers", () => {
  it("marks a step active on step_started", () => {
    const initial = createInitialProgressState();
    const next = applyStreamStepStarted(initial, {
      step: 2,
      total: 5,
      label: "Building charts",
      key: "build_charts",
    });
    expect(next.activeStep).toBe(2);
    expect(next.statusLabel).toContain("Building charts");
  });

  it("records completed steps", () => {
    const initial = createInitialProgressState();
    const next = applyStreamStepCompleted(initial, {
      step: 1,
      total: 5,
      label: "Collecting data",
      key: "collect_domain_data",
    });
    expect(next.completedSteps).toEqual([1]);
  });

  it("updates chart progress label", () => {
    const initial = createInitialProgressState();
    const next = applyStreamChartProgress(initial, {
      step: 2,
      index: 2,
      total: 5,
      section_id: "cpu_util",
      title: "CPU utilization",
    });
    expect(next.chartProgress?.section_id).toBe("cpu_util");
    expect(next.statusLabel).toContain("CPU utilization");
  });
});
