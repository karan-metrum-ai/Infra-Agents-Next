export interface TeamBuilderPanelProps {
  teamName: string;
  onTeamNameChange: (name: string) => void;
  nodeCount: number;
  edgeCount: number;
  selectedClusterId?: string | null;
  onClearCluster?: () => void;
}
