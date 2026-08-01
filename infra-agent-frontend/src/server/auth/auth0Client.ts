/**
 * Auth0 Management API client — ported 1:1 from
 * `infra_agents/auth/client/auth0_client.py`, including its one confirmed
 * discrepancy: `deleteUser`'s Python docstring claims it removes the user
 * from every organization first; the actual implementation (replicated here)
 * is a single DELETE call.
 */
import { config } from "@/server/auth/config";

interface M2mToken {
  token: string;
  expiresAt: number;
}

let cachedToken: M2mToken | null = null;

async function getManagementToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;

  const resp = await fetch(`https://${config.auth0Domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: config.auth0M2mClientId,
      client_secret: config.auth0M2mClientSecret,
      audience: `https://${config.auth0Domain}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });
  if (!resp.ok) throw new Error(`Auth0 token request failed: ${resp.status}`);
  const data = (await resp.json()) as { access_token: string; expires_in?: number };
  const expiresIn = data.expires_in ?? 86_400;
  cachedToken = { token: data.access_token, expiresAt: Date.now() + (expiresIn - 300) * 1000 };
  return cachedToken.token;
}

const BASE_URL_SUFFIX = "/api/v2";

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getManagementToken();
  const resp = await fetch(`https://${config.auth0Domain}${BASE_URL_SUFFIX}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Auth0 Management API ${method} ${path} failed: ${resp.status} ${text}`);
  }
  if (resp.status === 204) return undefined as T;
  const text = await resp.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const enc = (value: string) => encodeURIComponent(value);

export interface Auth0User {
  user_id: string;
  email?: string;
  name?: string;
  picture?: string;
  app_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Auth0Role {
  id: string;
  name: string;
  description?: string;
}

export interface Auth0Organization {
  id: string;
  name: string;
  display_name: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface Auth0AuthMethod {
  id: string;
  type: string;
  confirmed: boolean;
  name?: string | null;
  created_at?: string | null;
}

export const auth0Client = {
  getUser: (userId: string) => request<Auth0User>("GET", `/users/${enc(userId)}`),

  updateUser: (userId: string, fields: Record<string, unknown>) => {
    const allowed = new Set(["name", "given_name", "family_name", "nickname", "picture"]);
    const filtered = Object.fromEntries(Object.entries(fields).filter(([key]) => allowed.has(key)));
    return request<Auth0User>("PATCH", `/users/${enc(userId)}`, filtered);
  },

  getUserRoles: (userId: string) => request<Auth0Role[]>("GET", `/users/${enc(userId)}/roles`),

  assignUserRoles: (userId: string, roleIds: string[]) =>
    request<void>("POST", `/users/${enc(userId)}/roles`, { roles: roleIds }),

  setUserAppMetadata: (userId: string, metadata: Record<string, unknown>) =>
    request<Auth0User>("PATCH", `/users/${enc(userId)}`, { app_metadata: metadata }),

  getUserOrganizations: (userId: string) =>
    request<Auth0Organization[]>("GET", `/users/${enc(userId)}/organizations`),

  getOrganization: (orgId: string) => request<Auth0Organization>("GET", `/organizations/${orgId}`),

  getOrganizationMembers: async (orgId: string) => {
    const result = await request<Auth0Organization[] | { members: Auth0Organization[] }>(
      "GET",
      `/organizations/${orgId}/members`,
    );
    return Array.isArray(result) ? result : result.members;
  },

  addOrgMember: (orgId: string, userId: string) =>
    request<void>("POST", `/organizations/${orgId}/members`, { members: [userId] }),

  getUserAuthenticationMethods: (userId: string) =>
    request<Auth0AuthMethod[]>("GET", `/users/${enc(userId)}/authentication-methods`),

  deleteUserAuthenticationMethod: (userId: string, methodId: string) =>
    request<void>("DELETE", `/users/${enc(userId)}/authentication-methods/${enc(methodId)}`),

  /** Single DELETE call — matches the actual Python implementation, not its docstring. */
  deleteUser: (userId: string) => request<void>("DELETE", `/users/${enc(userId)}`),
};
