/**
 * Response types for the Workflow Designer's tool/agent catalog endpoints
 * (`workflowsApi.ts`). Ported from the Vite app's
 * `store/slices/apiSlice.ts` (`CatalogFeature`/`CatalogProvider`/
 * `CatalogCategory`/`CatalogResponse`/`AgentCatalogView`) — a 3-level
 * catalog hierarchy: categories → providers → features.
 */

export interface CatalogFeature {
  id: string;
  display_name: string;
  description?: string;
  mcp_tool: string;
  operation_type: "read" | "write";
  group?: string;
  agents_with_access: string[];
}

export interface CatalogProvider {
  id: string;
  display_name: string;
  description?: string;
  features: CatalogFeature[];
  agents_with_access: string[];
}

export interface CatalogCategory {
  id: string;
  display_name: string;
  description?: string;
  providers: CatalogProvider[];
  agents_with_access: string[];
}

export interface CatalogResponse {
  version: string;
  total_categories: number;
  total_providers: number;
  total_features: number;
  categories: CatalogCategory[];
}

/** Per-agent catalog view: enabled tools grouped by category → provider → tool names. */
export interface AgentCatalogView {
  agent_name: string;
  display_name?: string;
  tool_catalog: Record<string, Record<string, string[]>>;
  mcp_tools: string[];
  total_tools: number;
}
