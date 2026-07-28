export interface DelegationBreakdownProps {
  /** Map of delegation type -> count, e.g. { metrumai: 12, level1_support: 4 } */
  delegations: Record<string, number>;
  isLoading?: boolean;
}
