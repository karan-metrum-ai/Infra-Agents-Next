import { FolderOpen, PlusCircle, type LucideIcon } from "lucide-react";
import {
  LEVEL_CONFIG,
  LEVEL_ORDER,
  type LevelResult,
  type SingleStepUploadResponse,
} from "@/features/onboarding/onboardingApi.types";

/**
 * Pure helpers + static option data for `BulkUploadStepper`, split out of
 * the component per `002-structure.mdc`'s co-location convention so the
 * component file stays focused on rendering/orchestration.
 *
 * Ported from the Vite app's `components/BulkUploadStepper.tsx` module-level
 * constants and helper functions (verbatim logic, only the import sources
 * changed to this app's `onboardingApi.types`).
 */

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export type ClusterMode = "existing" | "create";

/** Discrete UI phases. Only one phase is rendered at a time. */
export type Phase = "setup" | "uploading" | "success" | "failure";

export const CLUSTER_MODE_OPTIONS: ReadonlyArray<{
  id: ClusterMode;
  icon: LucideIcon;
  label: string;
  description: string;
}> = [
  {
    id: "existing",
    icon: FolderOpen,
    label: "Existing cluster",
    description: "Add to a cluster you have",
  },
  {
    id: "create",
    icon: PlusCircle,
    label: "Create new",
    description: "Spin up a fresh cluster",
  },
];

export function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `.csv` extension, non-empty, <= 50MB — same rules as the Vite source. */
export function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) return "Only .csv files are accepted.";
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_FILE_BYTES) return `Exceeds 50 MB limit (${fmtBytes(file.size)}).`;
  return null;
}

export function extractError(err: unknown): string {
  const e = err as {
    status?: number;
    data?: { detail?: string | { msg?: string }[] };
    error?: string;
  };
  if (e?.status === 0 || e?.error === "FETCH_ERROR") {
    return "Unable to reach the upload service. Check your connection.";
  }
  if (e?.status === 503) return "Service unavailable. Try again in a moment.";
  if (e?.status === 413) return "File too large. Maximum is 50 MB.";
  const detail = e?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((item) => item.msg ?? "Error").join("; ");
  }
  return "Upload failed. Review your CSV and retry.";
}

/** A full 5-level list where every level has the same placeholder `status`. */
function buildLevelSkeleton(status: LevelResult["status"]): LevelResult[] {
  return LEVEL_ORDER.map((level) => ({
    level,
    level_name: LEVEL_CONFIG[level].name,
    status,
    object_types: [],
    total_created: 0,
    total_failed: 0,
    errors: [],
  }));
}

/**
 * Build a full 5-level display list by merging the backend result with the
 * canonical `LEVEL_ORDER`. Missing levels stay as `pending`.
 */
export function buildDisplayLevels(
  result: SingleStepUploadResponse | null,
  uploading: boolean,
): LevelResult[] {
  if (uploading) return buildLevelSkeleton("processing");
  if (!result) return buildLevelSkeleton("pending");

  const byLevel = new Map<number, LevelResult>(
    (result.level_results ?? []).map((lr) => [lr.level, lr]),
  );

  return LEVEL_ORDER.map((level) => {
    const fromResult = byLevel.get(level);
    if (fromResult) return fromResult;
    return {
      level,
      level_name: LEVEL_CONFIG[level].name,
      status: "pending" as const,
      object_types: [],
      total_created: 0,
      total_failed: 0,
      errors: [],
    };
  });
}
