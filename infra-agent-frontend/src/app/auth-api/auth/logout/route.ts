import { NextRequest, NextResponse } from "next/server";
import { config } from "@/server/auth/config";
import { sessionCookieAttributes, unsignSessionId } from "@/server/auth/cookies";
import { revokeRefreshToken } from "@/server/auth/oauth";
import { clientIp, getSessionFromCookie } from "@/server/auth/session";
import { getSessionStore } from "@/server/auth/sessionStore";
import { auditRecord } from "@/server/auth/auditLog";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie(request);

  if (session?.refreshToken) {
    await revokeRefreshToken(session.refreshToken);
  }

  const cookieValue = request.cookies.get(config.sessionCookieName)?.value;
  if (cookieValue) {
    const sessionId = unsignSessionId(cookieValue, config.sessionMaxAge);
    if (sessionId) {
      const store = await getSessionStore();
      await store.delete(sessionId);
    }
  }

  void auditRecord({
    eventType: "LOGOUT",
    eventCategory: "auth",
    outcome: "success",
    userId: session?.userId ?? null,
    organizationId: session?.tenantId ?? null,
    actorRole: session?.role ?? null,
    sourceIp: clientIp(request),
    userAgent: request.headers.get("user-agent") ?? undefined,
  });

  const returnTo = encodeURIComponent(config.bffBaseUrl);
  const logoutUrl = `https://${config.auth0Domain}/v2/logout?client_id=${config.auth0BffClientId}&returnTo=${returnTo}`;

  const response = NextResponse.redirect(logoutUrl);
  response.cookies.set(config.sessionCookieName, "", { ...sessionCookieAttributes(), maxAge: 0 });
  return response;
}
