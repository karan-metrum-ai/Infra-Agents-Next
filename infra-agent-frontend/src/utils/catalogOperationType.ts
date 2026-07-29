/**
 * Classifies a tool-catalog feature's operation type (`read` | `write`)
 * when the backend doesn't supply `operation_type` directly, and
 * normalizes a full `CatalogResponse` so every feature has one resolved.
 *
 * Ported from the Vite app's `src/lib/catalogOperationType.ts`. Per this
 * project's own `002-structure.mdc` placement table ("Utility function →
 * src/utils/", "3rd party client init → src/lib/"), this is a pure utility
 * function with no external client/SDK to initialize, so it belongs in
 * `src/utils/` rather than `src/lib/` — the Vite app had it in `lib/`
 * (and, per Phase 13's note in `CLAUDE.md`, a near-duplicate also existed
 * in its `utils/`). This resolves that duplication in favor of the
 * correct location per this project's rules, mirroring how
 * `src/components/DigitalTwin/rackLayout.types.ts` documented its own
 * pull-forward decision.
 */
import type { CatalogFeature, CatalogResponse } from "@/features/workflows/workflowsApi.types";

const WRITE_MCP_TOOLS = new Set([
  "perform_server_reboot",
  "perform_server_bios_update",
  "perform_server_firmware_upgrade",
  "perform_server_provisioning",
  "perform_provisioning",
  "reboot_network_device",
  "complete_network_device_reboot",
  "run_cable_test",
  "bounce_core_router_interface",
  "create_network_jira_ticket",
  "update_network_jira_ticket",
  "create_servicenow_incident",
  "create_or_update_incident",
  "create_or_update_incidents_batch",
  "record_servicenow_incident_report",
  "update_servicenow_incident",
  "add_servicenow_incident_attachment_base64",
  "send_query_to_team",
  "run_insights",
  "remediate_connection_pool",
  "remediate_blocking_sessions",
  "stop_deadlock_cron",
  "add_machine",
  "create_project",
  "schedule_project",
  "vastai_machine_setup",
  "create_vmware_vm",
  "clone_vmware_vm",
  "delete_vmware_vm",
  "power_on_vmware_vm",
  "power_off_vmware_vm",
  "reboot_vmware_vm",
  "sst_update_firmware",
  "sst_set_device_flag",
  "sst_run_secure_erase",
  "sst_run_self_test",
  "micron_update_firmware",
  "micron_set_device_flag",
  "micron_run_secure_erase",
  "micron_run_self_test",
]);

const WRITE_PREFIXES = [
  "create_",
  "update_",
  "delete_",
  "add_",
  "perform_",
  "remediate_",
  "stop_",
  "bounce_",
  "power_",
  "reboot_",
  "clone_",
  "schedule_",
  "record_",
  "run_secure_erase",
  "update_firmware",
  "set_device_flag",
  "run_self_test",
  "vastai_",
];

export function classifyMcpOperationType(mcpTool: string): "read" | "write" {
  if (WRITE_MCP_TOOLS.has(mcpTool)) return "write";
  const lowered = mcpTool.toLowerCase();
  if (WRITE_PREFIXES.some((prefix) => lowered.startsWith(prefix))) return "write";
  return "read";
}

interface FeatureLike {
  mcp_tool: string;
  operation_type?: unknown;
  operationType?: unknown;
}

export function resolveOperationType(feature: FeatureLike): "read" | "write" {
  const raw = feature.operation_type ?? feature.operationType;
  if (raw === "write" || raw === "WRITE") return "write";
  if (raw === "read" || raw === "READ") return "read";
  return classifyMcpOperationType(feature.mcp_tool);
}

export function normalizeCatalogResponse(response: CatalogResponse): CatalogResponse {
  return {
    ...response,
    categories: response.categories.map((category) => ({
      ...category,
      providers: category.providers.map((provider) => ({
        ...provider,
        features: provider.features.map((feature) => ({
          ...feature,
          operation_type: resolveOperationType(feature),
        })),
      })),
    })),
  };
}

export function normalizeCatalogFeature(feature: CatalogFeature): CatalogFeature {
  return {
    ...feature,
    operation_type: resolveOperationType(feature),
  };
}
