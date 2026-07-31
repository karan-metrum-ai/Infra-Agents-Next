/**
 * Icon lookups for the tool/agent catalog hierarchy (category id → icon,
 * provider id → icon). Pulled forward from Phase 13's planned
 * `utils/catalogIcons.ts` because Phase 7 (Workflow Designer)'s
 * `AgentInspectorPanel`/`ToolCatalogPanel` genuinely need it now — a pure,
 * dependency-free lookup table, not a stub.
 *
 * Reconciled during Phase 13 against the Vite app's `lib/catalogIcons.ts`
 * (kept in `src/utils/` per `002-structure.mdc`'s placement table, same
 * `lib/`→`utils/` correction already applied to `catalogOperationType.ts`).
 * The two lists had diverged — this pass takes the union rather than
 * overwriting either side: both `getCategoryIcon`/`getProviderIcon` already
 * fall back to a generic icon (`Wrench`/`Box`) for an unknown id, so an
 * extra entry is harmless, while dropping an entry either side actually
 * depends on would regress it. Added from the Vite source: `security`/`siem`
 * categories, `zoho_desk`/`neocloud`/`rag`/`wazuh`/`connectivity_discovery`/
 * `compliance_auditing`/the `gpu_*_nvidia`/`gpu_*_amd`
 * pairs/`provisioning_configuration`/`security_hardening` providers, and the
 * `Shield` icon they need. Kept as-is from the earlier pull-forward: `database`/
 * `network`/`machine_setup` categories and `application`/`database_health`/
 * `container`/`postgresql`/`core_router`/`huawei`/`aruba`/`opmanager`/`telecom`/
 * the `platform_*` providers — real backend catalog ids Phase 7 already needed
 * that aren't in this particular Vite snapshot.
 */
import {
  Activity,
  BookOpen,
  Box,
  Brain,
  Cloud,
  Cpu,
  Database,
  Droplets,
  HardDrive,
  Layers,
  Network,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Ticket,
  Thermometer,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  itsm: Ticket,
  monitoring: Activity,
  infrastructure: Server,
  database: Database,
  network: Network,
  virtualization: Layers,
  ai_workload: Brain,
  machine_setup: Wrench,
  knowledge: BookOpen,
  storage: HardDrive,
  cooling: Thermometer,
  security: Shield,
  siem: Shield,
  automation: Terminal,
};

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  servicenow: Cloud,
  zoho_desk: Ticket,
  metrics: Activity,
  application: Cpu,
  system: Terminal,
  database: Database,
  database_health: Database,
  maas: Server,
  hardware: Cpu,
  container: Box,
  postgresql: Database,
  core_router: Network,
  huawei: Network,
  aruba: Network,
  opmanager: Activity,
  telecom: Network,
  vmware: Layers,
  neoforge: Brain,
  metrumai: Sparkles,
  insights: Sparkles,
  vastai: Wrench,
  neocloud: Cloud,
  kb: BookOpen,
  rag: BookOpen,
  sst: HardDrive,
  solidigm_sst: HardDrive,
  micron: HardDrive,
  cdu: Droplets,
  wazuh: Shield,
  // Automation providers are named by subsystem (not read/write).
  ansible_core: Terminal,
  connectivity_discovery: Network,
  compliance_auditing: Activity,
  external_playbooks: Box,
  gpu_diagnostics_nvidia: Cpu,
  gpu_diagnostics_amd: Cpu,
  gpu_driver_management_nvidia: Wrench,
  gpu_driver_management_amd: Wrench,
  gpu_node_exporter_nvidia: Activity,
  gpu_node_exporter_amd: Activity,
  provisioning_configuration: Server,
  security_hardening: Shield,
  platform_connectivity: Network,
  platform_compliance: Activity,
  platform_provisioning: Server,
  platform_security: Cpu,
};

export function getCategoryIcon(categoryId: string): LucideIcon {
  return CATEGORY_ICONS[categoryId] ?? Wrench;
}

export function getProviderIcon(providerId: string): LucideIcon {
  return PROVIDER_ICONS[providerId] ?? Box;
}
