import type { ReactNode } from "react";
import type { AppRole } from "@/features/auth/authSelectors";

export interface AuthGuardProps {
  children: ReactNode;
  /**
   * When provided, the user's role must be one of these values. Checked
   * only after the session has resolved; on mismatch the user is redirected
   * to /dashboard/live.
   */
  requiredRoles?: AppRole[];
}
