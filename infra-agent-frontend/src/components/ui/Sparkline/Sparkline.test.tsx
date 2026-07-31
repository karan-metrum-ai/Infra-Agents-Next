import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const mockSetOption = vi.fn<(...args: unknown[]) => void>();
const mockResize = vi.fn<() => void>();
const mockDispose = vi.fn<() => void>();
const mockInit = vi.fn<
  (...args: unknown[]) => {
    setOption: typeof mockSetOption;
    resize: typeof mockResize;
    dispose: typeof mockDispose;
  }
>(() => ({
  setOption: mockSetOption,
  resize: mockResize,
  dispose: mockDispose,
}));

vi.mock("echarts/core", () => ({
  use: vi.fn<() => void>(),
  init: (...args: unknown[]) => mockInit(...args),
  graphic: {
    LinearGradient: vi.fn<() => void>(),
  },
}));

vi.mock("echarts/charts", () => ({
  LineChart: {},
}));

vi.mock("echarts/components", () => ({
  GridComponent: {},
  TooltipComponent: {},
}));

vi.mock("echarts/renderers", () => ({
  CanvasRenderer: {},
}));

import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  beforeEach(() => {
    mockInit.mockClear();
    mockSetOption.mockClear();
    mockResize.mockClear();
    mockDispose.mockClear();
  });

  it("initializes ECharts for multi-point data", () => {
    render(<Sparkline data={[1, 2, 3, 4, 5]} />);
    expect(mockInit).toHaveBeenCalled();
    expect(mockSetOption).toHaveBeenCalled();
  });

  it("renders dashed placeholder when data is empty", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.querySelector('[data-testid="sparkline-placeholder"]')).not.toBeNull();
  });

  it("does not initialize ECharts for single-point data", () => {
    render(<Sparkline data={[42]} />);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("initializes ECharts for two or more points", () => {
    render(<Sparkline data={[10, 20, 30]} />);
    expect(mockInit).toHaveBeenCalled();
  });

  it("passes custom width and height to the chart container", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={120} height={50} />);
    const chart = container.querySelector('[data-testid="sparkline-chart"]');
    expect(chart).not.toBeNull();
    expect((chart as HTMLElement).style.width).toBe("120px");
    expect((chart as HTMLElement).style.height).toBe("50px");
  });

  it("skips null values and still initializes ECharts", () => {
    render(<Sparkline data={[1, null, 3, undefined, 5]} />);
    expect(mockInit).toHaveBeenCalled();
  });

  it("initializes ECharts when filled=true (default)", () => {
    render(<Sparkline data={[1, 2, 3]} filled />);
    expect(mockInit).toHaveBeenCalled();
  });

  it("initializes ECharts when filled=false", () => {
    render(<Sparkline data={[1, 2, 3]} filled={false} />);
    expect(mockInit).toHaveBeenCalled();
  });

  it("sets aria-label to provided value", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} ariaLabel="GPU utilization trend" />);
    const chart = container.querySelector('[data-testid="sparkline-chart"]');
    expect(chart?.getAttribute("aria-label")).toBe("GPU utilization trend");
  });

  it("renders all-NaN data as placeholder", () => {
    const { container } = render(<Sparkline data={[NaN, NaN, NaN]} />);
    expect(container.querySelector('[data-testid="sparkline-placeholder"]')).not.toBeNull();
  });

  it("accepts timestamps for time-axis series data", () => {
    render(<Sparkline data={[10, 20, 30]} timestamps={[1_000, 2_000, 3_000]} />);
    expect(mockInit).toHaveBeenCalled();
    expect(mockSetOption).toHaveBeenCalled();
  });
});
