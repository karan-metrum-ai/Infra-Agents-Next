import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MarkdownRenderer from "./MarkdownRenderer";

/**
 * The renderer must tolerate the partial Markdown that arrives mid-stream
 * (unclosed code fences, half-written emphasis, incomplete lists) without
 * crashing, and must not leak raw Markdown control characters once a
 * construct is complete.
 *
 * Ported from Vite's `MarkdownRenderer.test.tsx` with one fix: the source
 * file's "renders relative download links" test was missing its closing
 * `});` (a genuine syntax bug there, not a behavior change here).
 */
describe("MarkdownRenderer — mid-stream resilience", () => {
  it("renders headings and lists as elements, not raw syntax", () => {
    const { container } = render(
      <MarkdownRenderer content={"# Status\n\n- first\n- second"} preprocess={false} />,
    );
    expect(container.querySelector("h1")?.textContent).toBe("Status");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.textContent).not.toContain("# Status");
  });

  it("does not throw on an unclosed code fence", () => {
    expect(() =>
      render(<MarkdownRenderer content={"```js\nconst a = 1"} preprocess={false} />),
    ).not.toThrow();
  });

  it("does not throw on partial emphasis tokens", () => {
    const { container } = render(
      <MarkdownRenderer content={"analysing **dell-r740"} preprocess={false} />,
    );
    expect(container.textContent).toContain("analysing");
  });

  it("renders an empty string without crashing", () => {
    expect(() => render(<MarkdownRenderer content="" preprocess={false} />)).not.toThrow();
  });

  it("renders relative download links as clickable anchors", () => {
    const { container } = render(
      <MarkdownRenderer
        content={"[report.pdf](/clusterid-1/reports/default/report_20260101.pdf)"}
        preprocess={false}
      />,
    );
    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/clusterid-1/reports/default/report_20260101.pdf");
  });

  it("renders inline headings after task_goal normalization", () => {
    const { container } = render(
      <MarkdownRenderer content={"## Remediation Brief ### 1. Root Cause"} context="task_goal" />,
    );
    expect(container.querySelector("h2")?.textContent).toBe("Remediation Brief");
    expect(container.querySelector("h3")?.textContent).toBe("1. Root Cause");
    expect(container.textContent).not.toContain("## Remediation");
  });
});
