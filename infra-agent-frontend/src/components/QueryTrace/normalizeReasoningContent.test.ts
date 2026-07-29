import { describe, expect, it } from "vitest";
import { normalizeReasoningContent } from "./normalizeReasoningContent";

describe("normalizeReasoningContent", () => {
  it("joins per-token newline streaming into one paragraph", () => {
    const raw = ["The", "user", "wants", "to", "check", "health."].join("\n");

    expect(normalizeReasoningContent(raw)).toBe("The user wants to check health.");
  });

  it("drops duplicate snapshot after token stream", () => {
    const token = ["The", "user", "wants"].join("\n");
    const prose = "The user wants to check device health.";
    const raw = `${token}\n\n${prose}`;

    expect(normalizeReasoningContent(raw)).toBe(prose);
  });

  it("merges token prefix before first long prose line", () => {
    const raw = [
      "The",
      "query",
      "is",
      "classified",
      "as",
      "EXECUTE",
      "The query is classified as EXECUTE, targeting level 1.",
    ].join("\n");

    const result = normalizeReasoningContent(raw);
    expect(result).toContain("classified as EXECUTE");
    expect(result).not.toMatch(/^The\nquery/m);
  });
});
