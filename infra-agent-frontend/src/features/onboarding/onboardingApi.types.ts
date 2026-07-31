/**
 * Bulk-upload (CSV infrastructure ingestion) domain types.
 *
 * Ported from the Vite app's `store/slices/bulkUploadApiSlice.ts` — only
 * the `singleStepUpload` request/response shapes and level metadata that
 * `BulkUploadStepper.tsx` actually consumes. The Vite slice's deprecated
 * progressive-session endpoints (`createSession`/`uploadLevel`/etc.) and
 * its onboarding-devices-tree types (`OnboardingRegion`/`OnboardingSite`/...)
 * have zero consumers in `BulkUploadStepper.tsx` and are not ported —
 * `getClusterIds`/`ClusterIdInfo`/`ClusterIdsResponse` already exist in
 * `@/features/teams/teamsApi(.types)`, reused as-is rather than redeclared
 * here (same real backend surface, already has 3 live consumers).
 */

interface LevelConfigEntry {
  name: string;
  description: string;
  objectTypes: string[];
  optional?: boolean;
}

export const LEVEL_ORDER = [1, 2, 3, 4, 5] as const;

export const LEVEL_CONFIG: Record<number, LevelConfigEntry> = {
  1: {
    name: "Foundation Objects",
    description:
      "Tenant groups, tenants, tags, manufacturers, device roles, rack roles, regions, site groups",
    objectTypes: [
      "tenant_group",
      "tenant",
      "tag",
      "manufacturer",
      "device_role",
      "rack_role",
      "region",
      "site_group",
    ],
  },
  2: {
    name: "Geographic Structure",
    description: "Sites, locations",
    objectTypes: ["site", "location"],
  },
  3: {
    name: "Rack Infrastructure",
    description: "Device types, racks",
    objectTypes: ["device_type", "rack"],
  },
  4: {
    name: "Device Infrastructure",
    description: "Devices",
    objectTypes: ["device"],
  },
  5: {
    name: "Network Connectivity (Optional)",
    description: "Interfaces, cables, IP addresses",
    objectTypes: ["interface", "cable", "ip_address"],
    optional: true,
  },
};

export interface SingleStepError {
  line_number?: number;
  object_type?: string;
  field?: string;
  message: string;
  suggested_fix?: string;
}

export interface ObjectTypeResult {
  object_type: string;
  success: boolean;
  objects_processed: number;
  created: number;
  skipped: number;
  failed: number;
  errors: SingleStepError[];
}

export interface LevelResult {
  level: number;
  level_name: string;
  status: "completed" | "failed" | "skipped" | "pending" | "processing";
  object_types: ObjectTypeResult[];
  total_created: number;
  total_failed: number;
  errors: SingleStepError[];
}

export interface SingleStepUploadRequest {
  csv_file: File;
  tenant_id?: number;
  create_tenant_name?: string;
  create_tenant_description?: string;
  cluster_id?: number;
}

export interface SingleStepUploadResponse {
  success: boolean;
  session_id?: string;
  message: string;
  total_objects: number;
  total_created: number;
  total_skipped: number;
  total_failed: number;
  overall_progress: number;
  level_results: LevelResult[];
  errors: SingleStepError[];
  tenant?: {
    id: number;
    name: string;
    slug: string;
    created_now: boolean;
  };
  processing_time_seconds: number;
}
