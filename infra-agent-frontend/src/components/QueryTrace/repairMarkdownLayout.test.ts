import { describe, expect, it } from "vitest";
import { processTraceContent } from "./traceContentPipeline";
import {
  formatKeyValueRunBlocks,
  hasGfmTable,
  repairCollapsedMarkdown,
  repairMarkdownForDisplay,
  shouldPreserveMarkdownStructure,
} from "./repairMarkdownLayout";

const collapsedCduResponse = [
  "## CDU Triage Results ### Summary",
  "| CDU Device | Health Status | Anomalies Detected | Action | Incident |",
  "cdu-east-01 | Critical | Pump failure, low flow **12.06 LPM** |",
  "Replace pump | INC0012702",
].join(" ");

const structuredCduResponse = [
  "## CDU Server Health Status — Two Critical Issues Detected",
  "",
  "| CDU | Health | Key Anomaly | Incident |",
  "| --- | --- | --- | --- |",
  "| cdu-east-01 | Critical | Pump failure | INC0012702 |",
  "| cdu-west-02 | Warning | Low flow rate | INC0012703 |",
  "",
  "**cdu-east-01 — CRITICAL**",
  "- Deploy replacement primary pump",
  "- Validate flow >40 LPM",
].join("\n");

describe("repairMarkdownLayout", () => {
  it("detects GFM tables", () => {
    expect(hasGfmTable(structuredCduResponse)).toBe(true);
    expect(shouldPreserveMarkdownStructure(structuredCduResponse)).toBe(true);
  });

  it("repairs collapsed inline table rows into separate lines", () => {
    const repaired = repairCollapsedMarkdown(collapsedCduResponse);

    expect(repaired).toContain("## CDU Triage Results");
    expect(repaired).toContain("### Summary");
    expect(repaired).toContain("| CDU Device | Health Status |");
  });

  it("does not convert specialist tables into chip lists", () => {
    const result = processTraceContent(structuredCduResponse, {
      context: "agent_response",
    });

    expect(result.markdown).toContain("| CDU | Health | Key Anomaly | Incident |");
    expect(result.markdown).toContain("| cdu-east-01 | Critical |");
    expect(result.markdown).not.toContain("#### Cdu-East-01");
    expect(result.contentKind).toBe("table");
  });

  it("preserves headings and bold markers after full repair", () => {
    const repaired = repairMarkdownForDisplay(
      "## CDU Triage Results ### Summary **cdu-east-01 — CRITICAL**",
    );

    expect(repaired).toContain("## CDU Triage Results");
    expect(repaired).toContain("### Summary");
    expect(repaired).toContain("**cdu-east-01 — CRITICAL**");
  });

  it("repairs double-pipe joined table rows", () => {
    const collapsed = [
      "9 devices were discovered and checked:",
      "| Device | Category | BMC IP | Status | |---|---------|---------|---------|---------|| 1 | host-a | compute | 10.0.0.1 | warning || 2 | host-b | compute | 10.0.0.2 | critical |",
    ].join("\n");

    const repaired = repairMarkdownForDisplay(collapsed);

    expect(repaired).toContain("| Device | Category | BMC IP | Status |");
    expect(repaired).toContain("| 1 | host-a | compute | 10.0.0.1 | warning |");
    expect(repaired).toContain("| 2 | host-b | compute | 10.0.0.2 | critical |");
    expect(repaired).not.toContain("||");
  });

  it("renders repaired double-pipe tables through the pipeline", () => {
    const collapsed = [
      "## Metrics Report",
      "",
      "| Device | Category | Status | |---|---|---|| 1 | host-a | warning || 2 | host-b | critical |",
    ].join("\n");

    const result = processTraceContent(collapsed, {
      context: "agent_response",
    });

    expect(result.markdown).toContain("| Device | Category | Status |");
    expect(result.markdown).toMatch(/\|[\s\-|]+---[\s\-|]+\|/);
    expect(result.markdown).toContain("host-a");
    expect(result.markdown).not.toContain("||");
    expect(result.contentKind).toBe("table");
  });

  it("collapses consecutive key=value diagnostic lines into a table", () => {
    const input = [
      "Parallel triage completed.",
      "status=warning, findings=2, tools=0, duration=15773ms",
      "status=critical, findings=1, tools=0, duration=15682ms",
      "status=warning, findings=3, tools=0, duration=15849ms",
    ].join("\n");

    const repaired = formatKeyValueRunBlocks(input);

    expect(repaired).toContain("| Status | Findings | Tools | Duration |");
    expect(repaired).toContain("| warning | 2 | 0 | 15773ms |");
    expect(repaired).toContain("| critical | 1 | 0 | 15682ms |");
  });
});
