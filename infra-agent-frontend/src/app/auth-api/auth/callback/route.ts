import { NextRequest, NextResponse } from "next/server";
import { config } from "@/server/auth/config";
import { signSessionId, sessionCookieAttributes } from "@/server/auth/cookies";
import { exchangeCode, parseIdTokenUnverified } from "@/server/auth/oauth";
import { retrievePkceState } from "@/server/auth/pkceStore";
import { clientIp, ensureDefaultRole, resolveUserOrg } from "@/server/auth/session";
import { getSessionStore, newSessionId, type SessionData } from "@/server/auth/sessionStore";
import { auditRecord } from "@/server/auth/auditLog";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") ?? "";
  const state = searchParams.get("state") ?? "";
  const error = searchParams.get("error") ?? "";
  const errorDescription = searchParams.get("error_description") ?? "";

  const sourceIp = clientIp(request);
  const userAgent = request.headers.get("user-agent") ?? undefined;

  if (error) {
    void auditRecord({
      eventType: "LOGIN_FAILURE",
      eventCategory: "auth",
      outcome: "failure",
      sourceIp,
      userAgent,
      details: { reason: "oauth_error", error, error_description: errorDescription },
    });
    return NextResponse.redirect(`${config.bffBaseUrl}/?auth_error=${error}`);
  }

  const pkceState = await retrievePkceState(state);
  if (!pkceState) {
    void auditRecord({
      eventType: "LOGIN_FAILURE",
      eventCategory: "auth",
      outcome: "failure",
      sourceIp,
      userAgent,
      details: { reason: "invalid_state" },
    });
    return NextResponse.redirect(`${config.bffBaseUrl}/?auth_error=invalid_state`);
  }

  let tokenData;
  try {
    tokenData = await exchangeCode(code, pkceState.redirectUri, pkceState.codeVerifier);
  } catch (exc) {
    void auditRecord({
      eventType: "LOGIN_FAILURE",
      eventCategory: "auth",
      outcome: "failure",
      sourceIp,
      userAgent,
      details: { reason: "token_exchange_failed", error: String(exc) },
    });
    return NextResponse.redirect(`${config.bffBaseUrl}/?auth_error=token_exchange_failed`);
  }

  const accessToken = tokenData.access_token ?? "";
  const refreshToken = tokenData.refresh_token ?? "";
  const expiresIn = tokenData.expires_in ?? 86_400;
  const idClaims = parseIdTokenUnverified(tokenData.id_token ?? "");
  const userId = String(idClaims.sub ?? "");
  const email = String(idClaims.email ?? "");
  const name = String(idClaims.name ?? "");
  const picture = String(idClaims.picture ?? "");

  let orgId = "";
  let role = "viewer";
  try {
    const { org } = await resolveUserOrg(userId);
    if (org) orgId = org.id;
    role = await ensureDefaultRole(userId);
  } catch (orgRoleError) {
    console.error(`Non-fatal: org/role resolution failed for ${userId}:`, orgRoleError);
  }

  const sessionData: SessionData = {
    sessionId: newSessionId(),
    userId,
    email,
    name,
    picture,
    role,
    tenantId: orgId,
    accessToken,
    refreshToken,
    accessTokenExpiresAt: Date.now() / 1000 + expiresIn - 60,
    createdAt: Date.now() / 1000,
  };

  const store = await getSessionStore();
  try {
    await store.create(sessionData);
  } catch (exc) {
    console.error(`Failed to create session for user ${userId}:`, exc);
    // Matches the Python source: this failure branch is not audited.
    return NextResponse.redirect(`${config.bffBaseUrl}/?auth_error=session_creation_failed`);
  }

  void auditRecord({
    eventType: "LOGIN_SUCCESS",
    eventCategory: "auth",
    outcome: "success",
    organizationId: orgId || null,
    userId,
    actorRole: role,
    sourceIp,
    userAgent,
    details: { auth_method: "oauth_code_pkce", email },
  });

  const response = NextResponse.redirect(config.bffBaseUrl);
  response.cookies.set(
    config.sessionCookieName,
    signSessionId(sessionData.sessionId),
    sessionCookieAttributes(),
  );
  return response;
}
