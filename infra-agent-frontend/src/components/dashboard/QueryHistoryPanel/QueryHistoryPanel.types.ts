import type { FlowListItem } from "@/components/QueryTrace/flowPayload.types";

export type FlowStatusFilter = "all" | "active" | "completed" | "others";

export interface QueryHistoryPanelProps {
  flows: FlowListItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  /** Correlation id of the flow currently streaming live, if any. */
  activeCorrelationId?: string | null;
  onSelectFlow: (flow: FlowListItem) => void;
}
