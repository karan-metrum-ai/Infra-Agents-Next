/**
 * Auth selectors — session state reads and role-derived permissions.
 *
 * Permissions are UI-level RBAC only (which components render for a given
 * role); the backend Casbin policy is the real authorization boundary.
 */

import type { AuthState } from "@/features/auth/authSlice";

export type AppRole = "platform_admin" | "infra_admin" | "operator" | "viewer";

export interface RolePermissions {
  /** Can send messages via the chat panel and interact with agents. */
  canChat: boolean;
  /** Can approve or deny HITL (Human-in-the-Loop) requests. */
  canApprove: boolean;
}

const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  platform_admin: { canChat: true, canApprove: true },
  infra_admin: { canChat: true, canApprove: true },
  operator: { canChat: true, canApprove: true },
  viewer: { canChat: false, canApprove: false },
};

const FALLBACK_PERMISSIONS: RolePermissions = ROLE_PERMISSIONS.viewer;

/** Normalizes a raw backend role string to the platform convention. */
export function normalizeRole(role: string): string {
  return role.toLowerCase().replace(/ /g, "_");
}

export function getPermissionsForRole(role: string): RolePermissions {
  const normalized = normalizeRole(role);
  return ROLE_PERMISSIONS[normalized as AppRole] ?? FALLBACK_PERMISSIONS;
}

interface AuthRootState {
  auth: AuthState;
}

export const selectIsAuthenticated = (state: AuthRootState) => state.auth.isAuthenticated;
export const selectIsLoading = (state: AuthRootState) => state.auth.isLoading;
export const selectUser = (state: AuthRootState) => state.auth.user;
export const selectOrganization = (state: AuthRootState) => state.auth.organization;
export const selectUserRole = (state: AuthRootState) => state.auth.userRole;
export const selectIsOrgResolved = (state: AuthRootState) => state.auth.isOrgResolved;
export const selectIsFullyAuthenticated = (state: AuthRootState) =>
  state.auth.isAuthenticated && state.auth.isOrgResolved;

export const selectPermissions = (state: AuthRootState): RolePermissions =>
  state.auth.isOrgResolved ? getPermissionsForRole(state.auth.userRole) : FALLBACK_PERMISSIONS;
