import type { ReactNode } from "react";

export interface MetricCardProps {
  label: string;
  value: number | null;
  icon: ReactNode;
  color?: string;
  isLoading?: boolean;
  previousValue?: number | null;
  formatValue?: (value: number) => string;
}
