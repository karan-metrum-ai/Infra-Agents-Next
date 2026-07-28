import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card body</Card>);
    expect(screen.getByText("Card body")).toBeInTheDocument();
  });

  it('has data-slot="card"', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText("Content")).toHaveAttribute("data-slot", "card");
  });

  it("supports borderless variant", () => {
    const { container } = render(<Card variant="borderless">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toBeTruthy();
    expect(card).toHaveAttribute("data-slot", "card");
  });
});

describe("Card sub-components", () => {
  it("CardHeader renders with data-slot", () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText("Header")).toHaveAttribute("data-slot", "card-header");
  });

  it("CardTitle renders with data-slot", () => {
    render(<CardTitle>Title</CardTitle>);
    expect(screen.getByText("Title")).toHaveAttribute("data-slot", "card-title");
  });

  it("CardDescription renders", () => {
    render(<CardDescription>Desc</CardDescription>);
    expect(screen.getByText("Desc")).toHaveAttribute("data-slot", "card-description");
  });

  it("CardContent renders", () => {
    render(<CardContent>Body</CardContent>);
    expect(screen.getByText("Body")).toHaveAttribute("data-slot", "card-content");
  });

  it("CardFooter renders", () => {
    render(<CardFooter>Footer</CardFooter>);
    expect(screen.getByText("Footer")).toHaveAttribute("data-slot", "card-footer");
  });

  it("CardAction renders", () => {
    render(<CardAction>Action</CardAction>);
    expect(screen.getByText("Action")).toHaveAttribute("data-slot", "card-action");
  });

  it("all sub-components compose inside Card", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Card</CardTitle>
          <CardDescription>A description</CardDescription>
        </CardHeader>
        <CardContent>Content here</CardContent>
        <CardFooter>Footer here</CardFooter>
      </Card>,
    );

    expect(screen.getByText("My Card")).toBeInTheDocument();
    expect(screen.getByText("A description")).toBeInTheDocument();
    expect(screen.getByText("Content here")).toBeInTheDocument();
    expect(screen.getByText("Footer here")).toBeInTheDocument();
  });
});
