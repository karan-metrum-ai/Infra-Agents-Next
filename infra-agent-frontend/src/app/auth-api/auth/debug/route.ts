import { NextRequest, NextResponse } from "next/server";
import { config, getCookieDomain, isCookieSecure } from "@/server/auth/config";
import { unsignSessionId } from "@/server/auth/cookies";
import { getSessionStore } from "@/server/auth/sessionStore";

/**
 * Diagnostic endpoint — ported as-is from the Python source, including its
 * lack of auth gating (flagged there too as "non-production only", but
 * nothing enforces it). Bypasses the normal session wrapper to read the raw
 * store directly. Does not leak token values, only their presence.
 */
export async function GET(request: NextRequest) {
  const store = await getSessionStore();

  let redisPing: boolean | null = null;
  if (config.redisUrl) {
    try {
      redisPing = await store.ping();
    } catch {
      redisPing = false;
    }
  }

  const cookieValue = request.cookies.get(config.sessionCookieName)?.value;
  let sessionDebug: Record<string, unknown> | null = null;

  if (cookieValue) {
    const sessionId = unsignSessionId(cookieValue, config.sessionMaxAge);
    if (sessionId) {
      const exists = await store.exists(sessionId);
      const session = exists ? await store.get(sessionId) : null;
      sessionDebug = session
        ? {
            session_id_prefix: sessionId.slice(0, 8),
            user_id: session.userId,
            email: session.email,
            role: session.role,
            tenant_id: session.tenantId ? session.tenantId.slice(0, 8) : session.tenantId,
            created_at: session.createdAt,
            access_token_present: Boolean(session.accessToken),
            refresh_token_present: Boolean(session.refreshToken),
            access_token_expired: Date.now() / 1000 >= session.accessTokenExpiresAt,
            access_token_expires_in: Math.round(session.accessTokenExpiresAt - Date.now() / 1000),
          }
        : { exists };
    }
  }

  return NextResponse.json({
    config: {
      bff_base_url: config.bffBaseUrl,
      session_cookie_name: config.sessionCookieName,
      cookie_domain: getCookieDomain() ?? "(host-only)",
      cookie_secure: isCookieSecure(),
      redis_configured: Boolean(config.redisUrl),
    },
    request: {
      origin: request.headers.get("origin") ?? "not-set",
      host: request.headers.get("host") ?? "not-set",
      cookies_present: request.cookies.getAll().length > 0,
      session_cookie_present: Boolean(cookieValue),
      session_cookie_length: cookieValue?.length ?? 0,
    },
    stores: {
      session_store_type: store.name,
      pkce_store_type: store.name === "RedisSessionStore" ? "RedisPkceStore" : "InMemoryPkceStore",
      redis_ping: redisPing,
      redis_healthy: redisPing,
    },
    session: sessionDebug,
  });
}
