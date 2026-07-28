import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FreshnessBadge } from "./FreshnessBadge";

describe("FreshnessBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders "Live" for real-time freshness', () => {
    render(<FreshnessBadge dataFreshness="real-time" lastTelemetryTimestamp={null} />);
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });

  it('renders "Stale" for stale freshness', () => {
    render(<FreshnessBadge dataFreshness="stale" lastTelemetryTimestamp={null} />);
    expect(screen.getByText(/stale/i)).toBeInTheDocument();
  });

  it('renders "Unknown" for unknown freshness', () => {
    render(<FreshnessBadge dataFreshness="unknown" lastTelemetryTimestamp={null} />);
    expect(screen.getByText(/unknown/i)).toBeInTheDocument();
  });

  it('renders "Unknown" for unrecognized freshness values', () => {
    render(<FreshnessBadge dataFreshness="garbage-value" lastTelemetryTimestamp={null} />);
    expect(screen.getByText(/unknown/i)).toBeInTheDocument();
  });

  it('shows "just now" for very recent timestamp', () => {
    const ts = new Date(Date.now() - 1000).toISOString();
    render(<FreshnessBadge dataFreshness="real-time" lastTelemetryTimestamp={ts} />);
    expect(screen.getByText(/just now/i)).toBeInTheDocument();
  });

  it("shows relative age for older timestamp", () => {
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<FreshnessBadge dataFreshness="stale" lastTelemetryTimestamp={ts} />);
    expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
  });

  it("includes last telemetry in title attribute", () => {
    const ts = "2026-06-20T06:00:00.000Z";
    const { container } = render(
      <FreshnessBadge dataFreshness="real-time" lastTelemetryTimestamp={ts} />,
    );
    const badge = container.querySelector("[title]");
    expect(badge?.getAttribute("title")).toContain(ts);
  });

  it("handles null timestamp gracefully", () => {
    const { container } = render(
      <FreshnessBadge dataFreshness="real-time" lastTelemetryTimestamp={null} />,
    );
    expect(container.querySelector("[title]")?.getAttribute("title")).toContain(
      "No telemetry timestamp",
    );
  });
});
