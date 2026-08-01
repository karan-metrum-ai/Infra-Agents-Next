export interface ChatPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Fills the width of its parent panel instead of centering with a max-width. */
  embedded?: boolean;
}
