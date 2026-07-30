import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import MarkdownRenderer from "./MarkdownRenderer";

describe("MarkdownRenderer completed-flow tables", () => {
  it("renders repaired specialist tables as HTML table elements", () => {
    const content = [
      "## CDU Server Health Status",
      "",
      "| CDU | Health | Key Anomaly | Incident |",
      "| --- | --- | --- | --- |",
      "| cdu-east-01 | Critical | Pump failure | INC0012702 |",
    ].join("\n");

    const { container } = render(<MarkdownRenderer content={content} context="agent_response" />);

    expect(container.querySelector("h2")?.textContent).toContain("CDU Server Health Status");
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.querySelectorAll("th").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("td").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("cdu-east-01");
    expect(container.textContent).not.toContain("## CDU");
  });

  it("renders repaired double-pipe specialist tables as HTML tables", () => {
    const content = [
      "## Device Report",
      "",
      "Summary of checked hosts:",
      "| Device | Category | Status | |---|---|---|| 1 | host-a | warning || 2 | host-b | critical |",
    ].join("\n");

    const { container } = render(<MarkdownRenderer content={content} context="agent_response" />);

    expect(container.querySelector("table")).not.toBeNull();
    expect(container.textContent).toContain("host-a");
    expect(container.textContent).toContain("host-b");
    expect(container.textContent).not.toContain("||");
  });
});
