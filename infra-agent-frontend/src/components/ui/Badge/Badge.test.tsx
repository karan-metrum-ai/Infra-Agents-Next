import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("renders children text", () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it('has data-slot="badge"', () => {
    render(<Badge>Tag</Badge>);
    expect(screen.getByText("Tag")).toHaveAttribute("data-slot", "badge");
  });

  it("applies custom className", () => {
    render(<Badge className="my-class">Tag</Badge>);
    expect(screen.getByText("Tag")).toHaveClass("my-class");
  });

  it("renders with different variants without crashing", () => {
    const variants = [
      "default",
      "secondary",
      "destructive",
      "outline",
      "success",
      "warning",
      "info",
    ] as const;

    variants.forEach((variant) => {
      const { unmount } = render(<Badge variant={variant}>{variant}</Badge>);
      expect(screen.getByText(variant)).toBeInTheDocument();
      unmount();
    });
  });
});
