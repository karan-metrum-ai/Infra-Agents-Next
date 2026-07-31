import { describe, expect, it } from "vitest";
import {
  classifyMcpOperationType,
  normalizeCatalogResponse,
  resolveOperationType,
} from "./catalogOperationType";
import type { CatalogResponse } from "@/features/workflows/workflowsApi.types";

describe("catalogOperationType", () => {
  it("classifies known write MCP tools", () => {
    expect(classifyMcpOperationType("add_machine")).toBe("write");
    expect(classifyMcpOperationType("create_servicenow_incident")).toBe("write");
    expect(classifyMcpOperationType("list_onboarded_machines")).toBe("read");
    expect(classifyMcpOperationType("get_server_metrics")).toBe("read");
  });

  it("uses API operation_type when present", () => {
    expect(resolveOperationType({ mcp_tool: "get_server_metrics", operation_type: "write" })).toBe(
      "write",
    );
  });

  it("falls back to MCP tool classification when operation_type is missing", () => {
    expect(resolveOperationType({ mcp_tool: "perform_provisioning" })).toBe("write");
    expect(resolveOperationType({ mcp_tool: "list_onboarded_machines" })).toBe("read");
  });

  it("normalizes catalog response features", () => {
    // The raw backend payload may omit `operation_type` on a feature (the
    // whole point of normalization) even though `CatalogFeature` requires
    // it post-normalization -- cast the raw fixture rather than weakening
    // the shared type, matching the Vite source's intent without an
    // `as any` escape hatch.
    const raw = {
      version: "1.0.0",
      total_categories: 1,
      total_providers: 1,
      total_features: 2,
      categories: [
        {
          id: "infrastructure",
          display_name: "Infrastructure",
          providers: [
            {
              id: "maas",
              display_name: "MAAS",
              features: [
                {
                  id: "add_machine",
                  display_name: "Add Machine",
                  mcp_tool: "add_machine",
                  operation_type: "write",
                  agents_with_access: [],
                },
                {
                  id: "list_onboarded_machines",
                  display_name: "List Onboarded Machines",
                  mcp_tool: "list_onboarded_machines",
                  agents_with_access: [],
                },
              ],
              agents_with_access: [],
            },
          ],
          agents_with_access: [],
        },
      ],
    };
    const normalized = normalizeCatalogResponse(raw as CatalogResponse);

    const features = normalized.categories[0].providers[0].features;
    expect(features[0].operation_type).toBe("write");
    expect(features[1].operation_type).toBe("read");
  });
});
