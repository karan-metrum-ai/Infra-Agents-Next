import type { MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it('defaults to type="button"', () => {
    render(<Button>Btn</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it('allows type="submit" override', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it("fires onClick handler", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>();
    render(<Button onClick={onClick}>Click</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>();
    render(
      <Button onClick={onClick} disabled>
        Click
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies disabled attribute", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("forwards ref", () => {
    const ref = vi.fn<(el: HTMLElement | null) => void>();
    render(<Button ref={ref}>Ref</Button>);
    expect(ref).toHaveBeenCalled();
  });

  it("renders with render prop (cloneElement)", () => {
    render(
      // eslint-disable-next-line next/no-html-link-for-pages -- testing generic render-prop composition, not real page navigation
      <Button render={<a href="/test">Link</a>} nativeButton={false}>
        Text
      </Button>,
    );
    const link = screen.getByRole("button");
    expect(link).toHaveAttribute("href", "/test");
  });

  it("render prop respects disabled state", async () => {
    // Base UI's non-native-button mode assigns role="button" to the
    // composed <a> (matching the WAI-ARIA button widget pattern) so it
    // gets keyboard/aria-disabled handling identical to a real button.
    const user = userEvent.setup();
    const onClick = vi.fn<(event: MouseEvent<HTMLElement>) => void>();
    render(
      // eslint-disable-next-line next/no-html-link-for-pages -- testing generic render-prop composition, not real page navigation
      <Button render={<a href="/test">Link</a>} nativeButton={false} disabled onClick={onClick} />,
    );
    const link = screen.getByRole("button");
    expect(link).toHaveAttribute("aria-disabled", "true");
    await user.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });
});
