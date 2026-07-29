import { describe, expect, it } from "vitest";
import {
  flowListDisplayStatus,
  flowStatusCategory,
  isCronFlow,
  isManualFlow,
} from "./flowStreamApi";

describe("flowListDisplayStatus", () => {
  it("prefers flow execution status over evaluation status", () => {
    expect(
      flowListDisplayStatus({
        status: "completed",
        evaluation_status: "pending",
      }),
    ).toBe("completed");
  });

  it("falls back to evaluation status when execution status is empty", () => {
    expect(
      flowListDisplayStatus({
        status: "",
        evaluation_status: "completed",
      }),
    ).toBe("completed");
  });

  it("returns empty string when both statuses are missing", () => {
    expect(flowListDisplayStatus({ status: "", evaluation_status: "" })).toBe("");
  });
});

describe("flowStatusCategory", () => {
  it("maps completed execution statuses to completed", () => {
    expect(
      flowStatusCategory({
        status: "completed",
        evaluation_status: "pending",
      }),
    ).toBe("completed");
  });

  it("maps in-flight statuses to active", () => {
    expect(flowStatusCategory({ status: "running", evaluation_status: "" })).toBe("active");
    expect(flowStatusCategory({ status: "pending", evaluation_status: "" })).toBe("active");
    expect(flowStatusCategory({ status: "active", evaluation_status: "" })).toBe("active");
  });

  it("maps failed and error statuses to others", () => {
    expect(flowStatusCategory({ status: "failed", evaluation_status: "" })).toBe("others");
    expect(flowStatusCategory({ status: "error", evaluation_status: "" })).toBe("others");
  });
});

describe("isCronFlow / isManualFlow", () => {
  it("detects cron via source", () => {
    expect(isCronFlow({ source: "cron_job" })).toBe(true);
    expect(isManualFlow({ source: "cron_job" })).toBe(false);
  });

  it("detects cron via correlation_id prefix", () => {
    expect(
      isCronFlow({
        correlation_id: "cron-exec-3-flow-abc",
        source: null,
      }),
    ).toBe(true);
  });

  it("detects cron via session_id prefix", () => {
    expect(
      isCronFlow({
        session_id: "cron_noc_monitor_default_1",
        source: null,
      }),
    ).toBe(true);
  });

  it("treats normal chat flows as manual", () => {
    expect(
      isCronFlow({
        source: null,
        correlation_id: "flow-abc-123",
        session_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }),
    ).toBe(false);
    expect(
      isManualFlow({
        correlation_id: "flow-abc-123",
        session_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      }),
    ).toBe(true);
  });
});
