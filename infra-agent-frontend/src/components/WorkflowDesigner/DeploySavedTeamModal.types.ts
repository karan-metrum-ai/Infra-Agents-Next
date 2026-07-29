export interface DeploySavedTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTeam: (teamId: string, clusterId: string) => void;
}
