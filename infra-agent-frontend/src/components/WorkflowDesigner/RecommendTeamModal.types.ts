import type { ComponentType } from "react";

export type RecommendFeatureCategory =
  | "monitoring"
  | "operations"
  | "troubleshooting"
  | "analytics"
  | "infrastructure"
  | "reporting"
  | "security";

export interface RecommendFeature {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  category: RecommendFeatureCategory;
  row: "top" | "bottom";
}

export interface RecommendTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired with the selected feature ids; the parent orchestrator turns this into a `getRecommendedTeam` call. */
  onShowRecommendedTeam: (selectedFeatures: string[]) => void;
}
