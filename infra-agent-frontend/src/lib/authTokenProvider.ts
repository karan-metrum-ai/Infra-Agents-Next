/**
 * Auth identity provider (BFF mode).
 *
 * Tokens live server-side; the browser never sees them. This module only
 * retains the resolved identity (user/role/tenant) for dev-mode API header
 * injection, matching the backend's expected `x-forwarded-*` headers.
 */

export interface AuthIdentity {
  userId: string;
  role: string;
  tenantId: string;
}

let identity: AuthIdentity | null = null;

export function registerIdentity(nextIdentity: AuthIdentity): void {
  identity = nextIdentity;
}

export function clearTokenGetter(): void {
  identity = null;
}

export function getIdentity(): AuthIdentity | null {
  return identity;
}
