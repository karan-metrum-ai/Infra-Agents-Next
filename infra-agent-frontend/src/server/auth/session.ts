/**
 * Shared session/claims helpers used by multiple route handlers — ported
 * from the corresponding free functions in `main.py`
 * (`_session_from_cookie`, `_ensure_session_tokens`, `_refresh_session_role`,
 * `_resolve_user_org`, `_ensure_default_role`, `_extract_claims`, `_client_ip`).
 */
import type { NextRequest } from "next/server";
import { config } from "@/server/auth/config";
import { unsignSessionId } from "@/server/auth/cookies";
import {
  getSessionStore,
  isAccessTokenExpired,
  type SessionData,
} from "@/server/auth/sessionStore";
import { refreshAccessToken } from "@/server/auth/oauth";
import { auth0Client, type Auth0Organization } from "@/server/auth/auth0Client";
import { validateAccessToken } from "@/server/auth/jwt";
import { auditRecord } from "@/server/auth/auditLog";

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface Claims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  role?: string;
  tenant_id?: string;
}

export function clientIp(request: NextRequest): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return null;
}

export async function getSessionFromCookie(request: NextRequest): Promise<SessionData | null> {
  const cookieValue = request.cookies.get(config.sessionCookieName)?.value;
  if (!cookieValue) return null;
  const sessionId = unsignSessionId(cookieValue, config.sessionMaxAge);
  if (!sessionId) return null;
  const store = await getSessionStore();
  return store.get(sessionId);
}

export async function ensureSessionTokens(session: SessionData): Promise<SessionData> {
  if (!isAccessTokenExpired(session) || !session.refreshToken) return session;
  try {
    const tokenData = await refreshAccessToken(session.refreshToken);
    session.accessToken = tokenData.access_token ?? session.accessToken;
    session.accessTokenExpiresAt = Date.now() / 1000 + (tokenData.expires_in ?? 86_400) - 60;
    if (tokenData.refresh_token) session.refreshToken = tokenData.refresh_token;
    const store = await getSessionStore();
    await store.update(session);
  } catch (error) {
    console.error("Access token refresh failed (non-fatal):", error);
  }
  return session;
}

/** Assigns the default viewer role in Auth0 if the user has none yet. */
export async function ensureDefaultRole(userId: string): Promise<string> {
  try {
    const roles = await auth0Client.getUserRoles(userId);
    if (roles.length > 0) return roles[0].name;
  } catch (error) {
    console.error("Failed to fetch user roles (falling back to viewer):", error);
  }

  try {
    if (config.auth0ViewerRoleId) {
      await auth0Client.assignUserRoles(userId, [config.auth0ViewerRoleId]);
    }
    await auth0Client.setUserAppMetadata(userId, { role: "viewer" });
    void auditRecord({
      eventType: "USER_ROLE_ASSIGNED",
      eventCategory: "user_lifecycle",
      outcome: "success",
      userId,
      details: { role: "viewer", source: "default" },
    });
  } catch (error) {
    console.error("Failed to assign default viewer role:", error);
  }
  return "viewer";
}

export async function refreshSessionRole(session: SessionData): Promise<SessionData> {
  const role = await ensureDefaultRole(session.userId);
  if (role !== session.role) {
    session.role = role;
    const store = await getSessionStore();
    await store.update(session);
  }
  return session;
}

export async function resolveUserOrg(
  userId: string,
): Promise<{ org: Auth0Organization | null; isNewMember: boolean }> {
  const userOrgs = await auth0Client.getUserOrganizations(userId);
  if (userOrgs.length > 0) return { org: userOrgs[0], isNewMember: false };

  if (!config.auth0DefaultOrgId) return { org: null, isNewMember: false };

  try {
    await auth0Client.addOrgMember(config.auth0DefaultOrgId, userId);
    const org = await auth0Client.getOrganization(config.auth0DefaultOrgId);
    void auditRecord({
      eventType: "USER_CREATED",
      eventCategory: "user_lifecycle",
      outcome: "success",
      userId,
      details: { method: "org_member_added", org_id: config.auth0DefaultOrgId },
    });
    return { org, isNewMember: true };
  } catch (error) {
    console.error("Failed to add user to default organization:", error);
    void auditRecord({
      eventType: "USER_CREATED",
      eventCategory: "user_lifecycle",
      outcome: "failure",
      userId,
      details: { org_id: config.auth0DefaultOrgId },
    });
    try {
      const org = await auth0Client.getOrganization(config.auth0DefaultOrgId);
      return { org, isNewMember: false };
    } catch {
      return { org: null, isNewMember: false };
    }
  }
}

export function orgToResponse(org: Auth0Organization) {
  return {
    id: org.id,
    name: org.name,
    display_name: org.display_name,
    domain: org.name,
    created_at: org.created_at ?? "",
    metadata: org.metadata ?? {},
  };
}

/**
 * Dual-auth resolver used by the Management-API-backed routes: cookie
 * session first (claims synthesized from `SessionData`, no Auth0 call), then
 * `Authorization: Bearer` JWT fallback (claims come straight from the access
 * token's own payload — `role`/`tenant_id` may be absent there).
 */
export async function extractClaims(request: NextRequest): Promise<Claims> {
  const session = await getSessionFromCookie(request);
  if (session) {
    return {
      sub: session.userId,
      email: session.email,
      name: session.name,
      picture: session.picture,
      role: session.role,
      tenant_id: session.tenantId,
    };
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    try {
      const payload = await validateAccessToken(token);
      return payload as Claims;
    } catch (error) {
      throw new AuthError(
        401,
        `Invalid access token: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new AuthError(401, "Missing or invalid authentication.");
}
