import { describe, it, expect } from "vitest";
import { getLinkDisplayText, isSafeLinkHref, normalizeLinkHref } from "./linkUtils";

describe("normalizeLinkHref", () => {
  it("rewrites localhost URLs to relative paths", () => {
    expect(normalizeLinkHref("http://localhost/clusterid-1/reports/default/report.pdf")).toBe(
      "/clusterid-1/reports/default/report.pdf",
    );
  });

  it("leaves absolute URLs unchanged", () => {
    expect(normalizeLinkHref("https://example.com/file.pdf")).toBe("https://example.com/file.pdf");
  });
});

describe("isSafeLinkHref", () => {
  it("accepts https URLs", () => {
    expect(isSafeLinkHref("https://example.com/report.pdf")).toBe(true);
  });

  it("accepts relative report paths", () => {
    expect(isSafeLinkHref("/reports/default/report_20260101.pdf")).toBe(true);
  });

  it("accepts cluster-scoped report paths", () => {
    expect(isSafeLinkHref("/clusterid-4001/reports/default/report.pdf")).toBe(true);
  });

  it("rejects javascript URLs", () => {
    expect(isSafeLinkHref("javascript:alert(1)")).toBe(false);
  });

  it("rejects path traversal", () => {
    expect(isSafeLinkHref("/reports/../etc/passwd")).toBe(false);
  });
});

describe("getLinkDisplayText", () => {
  it("uses the file name for download paths", () => {
    expect(getLinkDisplayText("/reports/default/report_20260101.pdf", "Link")).toBe(
      "report_20260101.pdf",
    );
  });
});
