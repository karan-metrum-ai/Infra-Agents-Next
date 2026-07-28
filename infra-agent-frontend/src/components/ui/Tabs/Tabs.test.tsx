import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

function renderTabs(defaultValue = "tab1") {
  return render(
    <Tabs defaultValue={defaultValue}>
      <TabsList>
        <TabsTrigger value="tab1">Tab One</TabsTrigger>
        <TabsTrigger value="tab2">Tab Two</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content One</TabsContent>
      <TabsContent value="tab2">Content Two</TabsContent>
    </Tabs>,
  );
}

describe("Tabs", () => {
  it("renders the default tab content", () => {
    renderTabs("tab1");
    expect(screen.getByText("Content One")).toBeInTheDocument();
    expect(screen.queryByText("Content Two")).not.toBeInTheDocument();
  });

  it("switches content on trigger click", async () => {
    const user = userEvent.setup();
    renderTabs("tab1");

    await user.click(screen.getByText("Tab Two"));

    expect(screen.getByText("Content Two")).toBeInTheDocument();
    expect(screen.queryByText("Content One")).not.toBeInTheDocument();
  });

  it('triggers have role="tab"', () => {
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
  });

  it('active trigger has aria-selected="true"', () => {
    renderTabs("tab1");
    const tab1 = screen.getByText("Tab One");
    expect(tab1).toHaveAttribute("aria-selected", "true");
    const tab2 = screen.getByText("Tab Two");
    expect(tab2).toHaveAttribute("aria-selected", "false");
  });

  it('content has role="tabpanel"', () => {
    renderTabs();
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });

  it("controlled mode calls onValueChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string, ...args: unknown[]) => void>();

    render(
      <Tabs value="tab1" onValueChange={onChange}>
        <TabsList>
          <TabsTrigger value="tab1">T1</TabsTrigger>
          <TabsTrigger value="tab2">T2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">C1</TabsContent>
        <TabsContent value="tab2">C2</TabsContent>
      </Tabs>,
    );

    await user.click(screen.getByText("T2"));
    expect(onChange).toHaveBeenCalledWith("tab2", expect.anything());
  });

  it('TabsList has role="tablist"', () => {
    renderTabs();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
