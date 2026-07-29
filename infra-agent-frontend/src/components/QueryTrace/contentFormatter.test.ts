import { describe, it, expect } from "vitest";
import {
  tryParseJSON,
  formatJSON,
  formatJSONForMarkdown,
  formatLinksInText,
  formatStructuredAgentResponse,
  normalizeInlineMarkdownStructure,
  preprocessContent,
  tryFlattenJsonToMarkdown,
} from "./contentFormatter";

describe("tryParseJSON", () => {
  it("parses valid JSON object", () => {
    const result = tryParseJSON('{"a": 1}');
    expect(result).toEqual({ a: 1 });
  });

  it("parses valid JSON array", () => {
    const result = tryParseJSON("[1, 2, 3]");
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns null for plain text", () => {
    expect(tryParseJSON("hello world")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(tryParseJSON("")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(tryParseJSON(null as unknown as string)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(tryParseJSON(42 as unknown as string)).toBeNull();
  });

  it("returns null for invalid JSON starting with {", () => {
    expect(tryParseJSON("{bad json}")).toBeNull();
  });

  it("trims whitespace before parsing", () => {
    const result = tryParseJSON('  {"key": "value"}  ');
    expect(result).toEqual({ key: "value" });
  });
});

describe("formatJSON", () => {
  it("pretty-prints an object", () => {
    const result = formatJSON({ a: 1, b: 2 });
    expect(result).toContain('"a": 1');
    expect(result).toContain('"b": 2');
  });

  it("uses custom indent", () => {
    const result = formatJSON({ a: 1 }, 4);
    expect(result).toBe('{\n    "a": 1\n}');
  });

  it("handles circular references gracefully", () => {
    const obj: Record<string, unknown> = {};
    obj.self = obj;
    const result = formatJSON(obj);
    expect(typeof result).toBe("string");
  });
});

describe("formatJSONForMarkdown", () => {
  it("wraps JSON in code block", () => {
    const result = formatJSONForMarkdown('{"a": 1}');
    expect(result).toMatch(/^```json\n/);
    expect(result).toMatch(/\n```$/);
  });

  it("returns non-JSON content unchanged", () => {
    expect(formatJSONForMarkdown("hello")).toBe("hello");
  });

  it("passes through existing json code blocks", () => {
    const block = '```json\n{"a":1}\n```';
    expect(formatJSONForMarkdown(block)).toBe(block);
  });

  it("handles empty/null input", () => {
    expect(formatJSONForMarkdown("")).toBe("");
    expect(formatJSONForMarkdown(null as unknown as string)).toBe(null);
  });
});

describe("formatLinksInText", () => {
  it("converts plain URLs to markdown links", () => {
    const result = formatLinksInText("Visit https://example.com today");
    expect(result).toContain("[https://example.com](https://example.com)");
  });

  it('handles "URL:" prefix', () => {
    const result = formatLinksInText("URL: https://example.com");
    expect(result).toContain("[Link](https://example.com)");
  });

  it("returns non-string input as-is", () => {
    expect(formatLinksInText(null as unknown as string)).toBeNull();
    expect(formatLinksInText("")).toBe("");
  });

  it("converts relative report paths to markdown links", () => {
    const result = formatLinksInText("Download at /reports/default/report_20260101.pdf");
    expect(result).toContain("[report_20260101.pdf](/reports/default/report_20260101.pdf)");
  });

  it("normalizes localhost URLs before linking", () => {
    const result = formatLinksInText("http://localhost/reports/default/report.pdf");
    expect(result).toContain("[report.pdf](/reports/default/report.pdf)");
  });
});

describe("preprocessContent", () => {
  it("unescapes \\n to newlines", () => {
    const result = preprocessContent("line1\\nline2");
    expect(result).toContain("\n");
  });

  it("unescapes \\t to tabs", () => {
    const result = preprocessContent("a\\tb");
    expect(result).toContain("\t");
  });

  it("removes wrapping quotes", () => {
    const result = preprocessContent('"hello world"');
    expect(result.startsWith('"')).toBe(false);
    expect(result.endsWith('"')).toBe(false);
  });

  it("detects JSON and wraps in code block", () => {
    const result = preprocessContent('{"status": "ok"}');
    expect(result).toMatch(/^```json\n/);
  });

  it("formats links in non-JSON text", () => {
    const result = preprocessContent("Check https://example.com");
    expect(result).toContain("[https://example.com](https://example.com)");
  });

  it("handles null/empty", () => {
    expect(preprocessContent("")).toBe("");
    expect(preprocessContent(null as unknown as string)).toBe(null);
  });

  it("flattens inline status summaries into sectioned lists", () => {
    const input =
      "Cluster 4001 has 11 total devices: **OK Status**: " +
      "dell-r7715-rr-01, dell-r7715-rr-02. **Critical Status**: " +
      "dell-r740-rr-02, leaf1a.";
    const result = preprocessContent(input);
    expect(result).toContain("### Cluster 4001 has 11 total devices");
    expect(result).toContain("#### OK Status");
    expect(result).toContain("- `dell-r7715-rr-01`");
    expect(result).toContain("#### Critical Status");
  });

  it("flattens grouped JSON status payloads", () => {
    const input = JSON.stringify({
      cluster: "4001",
      total: 11,
      ok: ["dell-r7715-rr-01"],
      critical: ["leaf1a"],
    });
    const result = preprocessContent(input);
    expect(result).toContain("### Cluster 4001");
    expect(result).toContain("**Total devices:** 11");
    expect(result).toContain("#### Ok Status");
    expect(result).toContain("- `leaf1a`");
  });
});

describe("formatStructuredAgentResponse", () => {
  it("returns original text when no status sections exist", () => {
    expect(formatStructuredAgentResponse("plain answer")).toBe("plain answer");
  });
});

describe("normalizeInlineMarkdownStructure", () => {
  it("splits inline headings onto separate lines", () => {
    const input = "## Remediation Brief ### 1. Root Cause ### 2. Thermal Risk";
    const result = normalizeInlineMarkdownStructure(input);
    expect(result).toContain("## Remediation Brief");
    expect(result).toContain("\n\n### 1. Root Cause");
    expect(result).toContain("\n\n### 2. Thermal Risk");
  });

  it("splits inline bullet lists onto separate lines", () => {
    const input = "Actions required. - Migrate workloads - Throttle batch jobs";
    const result = normalizeInlineMarkdownStructure(input);
    expect(result).toContain("Actions required.");
    expect(result).toContain("\n\n- Migrate workloads");
  });

  it("preserves emojis in text", () => {
    const input = "## Status ⚠️ Critical 🔥";
    const result = normalizeInlineMarkdownStructure(input);
    expect(result).toContain("⚠️");
    expect(result).toContain("🔥");
  });
});

describe("tryFlattenJsonToMarkdown", () => {
  it("renders device arrays as tables", () => {
    const result = tryFlattenJsonToMarkdown([
      { name: "leaf1a", status: "critical" },
      { name: "leaf1b", status: "ok" },
    ]);
    expect(result).toContain("| Name | Status |");
    expect(result).toContain("leaf1a");
  });
});
