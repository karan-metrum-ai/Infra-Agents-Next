import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DeviceTelemetryProbes } from "@/schemas/telemetryProbe.schema";
import { TelemetryProbesRow } from "./TelemetryProbesRow";

const probes: DeviceTelemetryProbes = {
  bmc: {
    status: "flowing",
    last_seen_at: "2026-07-07T11:30:00.000Z",
    source: "idrac",
    age_seconds: 42,
  },
  os: {
    status: "missing",
    last_seen_at: null,
    source: "node_agent",
    age_seconds: null,
  },
};

describe("TelemetryProbesRow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders BMC and OS pills", () => {
    render(<TelemetryProbesRow probes={probes} />);
    expect(screen.getByText(/BMC/i)).toBeInTheDocument();
    expect(screen.getByText(/OS/i)).toBeInTheDocument();
  });

  it("sets aggregate title on wrapper", () => {
    const { container } = render(<TelemetryProbesRow probes={probes} />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("title")).toContain("Missing: OS metrics");
  });

  it("sets per-stream titles on pills", () => {
    const { container } = render(<TelemetryProbesRow probes={probes} />);
    const titles = Array.from(container.querySelectorAll("[title]")).map(
      (el) => el.getAttribute("title") ?? "",
    );
    expect(titles.some((t) => t.includes("BMC (iDRAC)"))).toBe(true);
    expect(titles.some((t) => t.includes("OS (node-agent)"))).toBe(true);
  });
});
