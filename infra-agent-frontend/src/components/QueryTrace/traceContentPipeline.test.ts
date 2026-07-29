/**
 * Tests for traceContentPipeline — unified markdown processing layer.
 */

import { describe, expect, it } from "vitest";
import { processTraceContent } from "./traceContentPipeline";

describe("processTraceContent", () => {
  describe("empty / invalid input", () => {
    it("returns empty for empty string", () => {
      const result = processTraceContent("", { context: "reasoning" });
      expect(result.markdown).toBe("");
      expect(result.contentKind).toBe("empty");
      expect(result.wasFlattened).toBe(false);
    });

    it("returns empty for non-string input", () => {
      const result = processTraceContent(null as unknown as string, { context: "reasoning" });
      expect(result.markdown).toBe("");
      expect(result.contentKind).toBe("empty");
    });
  });

  describe("unescape stage", () => {
    it("converts escaped newlines", () => {
      const result = processTraceContent("line1\\nline2", { context: "reasoning" });
      expect(result.markdown).toContain("line1\nline2");
    });

    it("strips wrapper quotes", () => {
      const result = processTraceContent('"wrapped content"', { context: "reasoning" });
      expect(result.markdown.trim()).toBe("wrapped content");
    });
  });

  describe("reasoning profile", () => {
    it("normalizes token-per-line SSE artifacts", () => {
      const raw = "Hello\nworld\nthis\nis\na\ntest\nof\nstreaming\ntokens";
      const result = processTraceContent(raw, { context: "reasoning" });
      // Token collapse should merge short single-word lines
      expect(result.markdown).not.toMatch(/^Hello\nworld$/m);
    });

    it("does not flatten JSON in reasoning context", () => {
      const raw = '{"key": "value"}';
      const result = processTraceContent(raw, { context: "reasoning" });
      expect(result.wasFlattened).toBe(false);
    });
  });

  describe("tool_output profile", () => {
    it("flattens device status JSON to markdown", () => {
      const raw = JSON.stringify({
        cluster: 4001,
        total: 11,
        ok: ["srv-01", "srv-02"],
        critical: ["srv-09"],
      });
      const result = processTraceContent(raw, { context: "tool_output" });
      expect(result.wasFlattened).toBe(true);
      expect(result.markdown).toContain("Cluster 4001");
      expect(result.markdown).toContain("Ok Status");
      expect(result.markdown).toContain("Critical Status");
      expect(result.contentKind).toBe("table");
    });

    it("shows placeholder while streaming JSON", () => {
      const raw = '{"partial": true';
      const result = processTraceContent(raw, { context: "tool_output", streaming: true });
      expect(result.markdown).toBe("*Receiving data…*");
      expect(result.contentKind).toBe("json");
    });

    it("caps table rows", () => {
      const rows = Array.from({ length: 15 }, (_, i) => `| ${i} | value${i} |`);
      const raw = ["| ID | Name |", "| --- | --- |", ...rows].join("\n");
      const result = processTraceContent(raw, { context: "tool_output", maxTableRows: 5 });
      const lines = result.markdown.split("\n");
      const dataRows = lines.filter((l) => l.startsWith("|") && !l.includes("---"));
      // Header + 5 rows + ellipsis row
      expect(dataRows.length).toBeLessThanOrEqual(7);
    });

    it("generates plain summary for flattened output", () => {
      const raw = JSON.stringify({ total: 5, ok: ["a", "b"] });
      const result = processTraceContent(raw, { context: "tool_summary" });
      expect(result.plainSummary).toBeTruthy();
    });
  });

  describe("final_response profile", () => {
    it("flattens JSON and formats links", () => {
      const raw = '{"url": "https://example.com"}';
      const result = processTraceContent(raw, { context: "final_response" });
      expect(result.markdown).toContain("```json");
    });

    it("allows more table rows than tool_output", () => {
      const raw = "| A |\n|---|\n| 1 |\n| 2 |\n| 3 |\n| 4 |\n| 5 |\n| 6 |";
      const result = processTraceContent(raw, { context: "final_response" });
      // Should not cap at 5 rows (default tool_output cap)
      expect(result.markdown).toContain("| 6 |");
    });
  });

  describe("agent_response profile", () => {
    it("clamps headings to h3 max", () => {
      const raw = "#### Heading 4\n##### Heading 5";
      const result = processTraceContent(raw, { context: "agent_response" });
      expect(result.markdown).not.toContain("#### Heading 4");
      expect(result.markdown).toContain("### Heading 4");
      expect(result.markdown).toContain("### Heading 5");
    });

    it("repairs orphan bold markers in specialist responses", () => {
      const raw = [
        "## Liquid Cooling Remediation Brief",
        "",
        "**",
        "1. Root Cause Confirmation**",
        "Open incidents LCS0009 affect CDU0005.",
        "",
        "**",
        "1. Thermal Risk**",
        "- CDU0005 inlet exceeds threshold.",
      ].join("\n");
      const result = processTraceContent(raw, { context: "agent_response" });
      expect(result.markdown).not.toMatch(/^\s*\*\*\s*$/m);
      expect(result.markdown).toContain("**Root Cause Confirmation**");
      expect(result.markdown).toContain("**Thermal Risk**");
    });
  });

  describe("query_header profile", () => {
    it("formats links but does not normalize streaming", () => {
      const raw = "Check https://example.com";
      const result = processTraceContent(raw, { context: "query_header" });
      expect(result.markdown).toContain("[https://example.com]");
    });
  });

  describe("executiveShape", () => {
    it("collapses 3+ consecutive blank lines", () => {
      const raw = "line1\n\n\n\n\nline2";
      const result = processTraceContent(raw, { context: "final_response" });
      expect(result.markdown).not.toMatch(/\n{4,}/);
    });
  });

  describe("plainSummary generation", () => {
    it("extracts first sentence for prose", () => {
      const raw = "This is the first sentence. This is the second.";
      const result = processTraceContent(raw, { context: "reasoning" });
      expect(result.plainSummary).toContain("This is the first sentence.");
    });

    it("extracts heading for table content", () => {
      const raw = "### Device Status\n\n| Name | Status |\n| --- | --- |\n| srv-01 | OK |";
      const result = processTraceContent(raw, { context: "tool_output" });
      expect(result.plainSummary).toBe("Device Status");
    });

    it("returns undefined for empty content", () => {
      const result = processTraceContent("", { context: "reasoning" });
      expect(result.plainSummary).toBeUndefined();
    });
  });

  describe("task_goal context", () => {
    it("normalizes inline headings and keeps emojis", () => {
      const raw = "## Remediation Brief ⚠️ ### 1. Root Cause **pump failure**";
      const result = processTraceContent(raw, { context: "task_goal" });
      expect(result.markdown).toContain("## Remediation Brief ⚠️");
      expect(result.markdown).toContain("### 1. Root Cause");
      expect(result.markdown).toContain("**pump failure**");
    });
  });
});
