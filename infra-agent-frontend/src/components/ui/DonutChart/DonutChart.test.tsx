import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DonutChart } from "./DonutChart";

const segments = [
  { value: 8, color: "#22c55e", label: "Healthy" },
  { value: 2, color: "#ef4444", label: "Critical" },
];

describe("DonutChart", () => {
  it("renders a fixed-px box by default (non-fluid, unchanged behavior)", () => {
    const { container } = render(<DonutChart segments={segments} size={68} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("width")).toBe("68");
    expect(svg?.getAttribute("height")).toBe("68");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 68 68");
  });

  it("renders center label as an absolutely-positioned HTML overlay by default", () => {
    const { container } = render(
      <DonutChart segments={segments} size={68} centerLabel="80%" centerSublabel="Healthy" />,
    );
    expect(container.querySelector("svg text")).toBeNull();
    expect(container.textContent).toContain("80%");
    expect(container.textContent).toContain("Healthy");
  });

  it("renders at 100%/100% with preserveAspectRatio when fluid", () => {
    const { container } = render(<DonutChart segments={segments} size={68} fluid />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("100%");
    expect(svg?.getAttribute("height")).toBe("100%");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 68 68");
    expect(svg?.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });

  it("renders center label as in-SVG text (not an HTML overlay) when fluid", () => {
    const { container } = render(
      <DonutChart segments={segments} size={68} centerLabel="80%" centerSublabel="Healthy" fluid />,
    );
    const texts = container.querySelectorAll("svg text");
    const textContent = Array.from(texts).map((t) => t.textContent);
    expect(textContent).toContain("80%");
    expect(textContent).toContain("Healthy");
  });

  it("never applies transform: scale to the ring/svg in either mode", () => {
    const { container: fixedContainer } = render(<DonutChart segments={segments} size={68} />);
    const { container: fluidContainer } = render(
      <DonutChart segments={segments} size={68} fluid />,
    );
    for (const c of [fixedContainer, fluidContainer]) {
      const svg = c.querySelector("svg");
      expect(svg?.getAttribute("style") || "").not.toContain("scale");
      const wrapperDiv = c.querySelector("div");
      expect(wrapperDiv?.getAttribute("style") || "").not.toContain("scale");
    }
  });
});
