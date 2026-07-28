import { useAppSelector } from "@/hooks/useAppSelector";
import { selectPermissions } from "@/features/auth/authSelectors";
import type { RolePermissions } from "@/features/auth/authSelectors";

/**
 * Returns the feature permission flags for the currently authenticated user.
 * Defaults to the most restrictive set (viewer) while the role is being
 * resolved, so no feature ever flashes visible before the role is confirmed.
 */
export function usePermissions(): RolePermissions {
  return useAppSelector(selectPermissions);
}
