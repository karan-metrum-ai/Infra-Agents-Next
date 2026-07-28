import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it('has data-slot="spinner"', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("data-slot", "spinner");
  });

  it("applies custom className", () => {
    const { container } = render(<Spinner className="my-spinner" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("my-spinner");
  });

  it("forwards ref", () => {
    const ref = vi.fn<(el: SVGSVGElement | null) => void>();
    render(<Spinner ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it("contains circle and path elements", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector("circle")).toBeInTheDocument();
    expect(container.querySelector("path")).toBeInTheDocument();
  });
});
