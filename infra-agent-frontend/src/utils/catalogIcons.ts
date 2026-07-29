/**
 * Icon lookups for the tool/agent catalog hierarchy (category id → icon,
 * provider id → icon). Pulled forward from Phase 13's planned
 * `utils/catalogIcons.ts` because Phase 7 (Workflow Designer)'s
 * `AgentInspectorPanel`/`ToolCatalogPanel` genuinely need it now — a pure,
 * dependency-free lookup table, not a stub. Reconcile with the real
 * Phase 13 port when that phase lands instead of keeping two copies,
 * mirroring how `rackLayout.types.ts` documented its own pull-forward in
 * Phase 6.
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
  automation: Terminal,
};

const PROVIDER_ICONS: Record<string, LucideIcon> = {
  servicenow: Cloud,
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
  kb: BookOpen,
  sst: HardDrive,
  micron: HardDrive,
  cdu: Droplets,
  ansible_core: Terminal,
  platform_connectivity: Network,
  platform_compliance: Activity,
  platform_provisioning: Server,
  platform_security: Cpu,
  external_playbooks: Box,
};

export function getCategoryIcon(categoryId: string): LucideIcon {
  return CATEGORY_ICONS[categoryId] ?? Wrench;
}

export function getProviderIcon(providerId: string): LucideIcon {
  return PROVIDER_ICONS[providerId] ?? Box;
}
