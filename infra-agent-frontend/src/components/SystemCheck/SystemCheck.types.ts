import type { ComponentType } from "react";
import type { CheckStatus } from "@/utils/systemCheck";

export interface CheckRow {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface Category {
  id: "rendering" | "environment" | "connectivity";
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  rowIds: string[];
}
