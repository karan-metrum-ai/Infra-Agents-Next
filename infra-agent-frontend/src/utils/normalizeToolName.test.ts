import { describe, it, expect } from "vitest";
import { normalizeToolName } from "./normalizeToolName";

describe("normalizeToolName", () => {
  it("converts snake_case to Title Case with minor words", () => {
    expect(normalizeToolName("create_or_update_servicenow_incident")).toBe(
      "Create or Update ServiceNow Incident",
    );
  });

  it("handles kebab-case", () => {
    expect(normalizeToolName("get-server-health")).toBe("Get Server Health");
  });

  it("handles camelCase", () => {
    expect(normalizeToolName("createIncidentReport")).toBe("Create Incident Report");
  });

  it("handles PascalCase", () => {
    expect(normalizeToolName("FetchPlanSnapshot")).toBe("Fetch Plan Snapshot");
  });

  it("handles mixed delimiters", () => {
    expect(normalizeToolName("fetch_planSnapshot-data")).toBe("Fetch Plan Snapshot Data");
  });

  it("preserves known acronyms in the middle of the label", () => {
    expect(normalizeToolName("get_cpu_id")).toBe("Get CPU ID");
    expect(normalizeToolName("reload_dns_config")).toBe("Reload DNS Config");
  });

  it("preserves brand casing for ServiceNow and iDRAC", () => {
    expect(normalizeToolName("servicenow_lookup")).toBe("ServiceNow Lookup");
    expect(normalizeToolName("idrac_reboot")).toBe("iDRAC Reboot");
  });

  it("capitalises a minor word when it is the first token", () => {
    expect(normalizeToolName("or_else_branch")).toBe("Or Else Branch");
  });

  it("handles a single word", () => {
    expect(normalizeToolName("submit")).toBe("Submit");
  });

  it("expands acronym followed by a word", () => {
    expect(normalizeToolName("HTTPServerStart")).toBe("HTTP Server Start");
  });

  it("returns an empty string for empty or invalid input", () => {
    expect(normalizeToolName("")).toBe("");
    // @ts-expect-error testing runtime guard
    expect(normalizeToolName(undefined)).toBe("");
    expect(normalizeToolName("   ")).toBe("");
  });
});
