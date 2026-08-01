/**
 * OAuth2 Authorization Code + PKCE flow against Auth0 — ported 1:1 from
 * `infra_agents/auth/client/oauth.py`.
 */
import { createHash, randomBytes } from "node:crypto";
import { config } from "@/server/auth/config";

export interface PkceChallenge {
  codeVerifier: string;
  codeChallenge: string;
}

export function generatePkce(): PkceChallenge {
  const codeVerifier = randomBytes(64).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier, "ascii").digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.auth0BffClientId,
    redirect_uri: redirectUri,
    scope: "openid profile email offline_access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  if (config.auth0Audience) params.set("audience", config.auth0Audience);
  return `https://${config.auth0Domain}/authorize?${params.toString()}`;
}

export interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const resp = await fetch(`https://${config.auth0Domain}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    console.error("Token endpoint call failed:", resp.status, text);
    throw new Error(`Token exchange failed: ${resp.status}`);
  }
  return (await resp.json()) as TokenResponse;
}

export function exchangeCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  return postToken({
    grant_type: "authorization_code",
    client_id: config.auth0BffClientId,
    client_secret: config.auth0BffClientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
}

export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return postToken({
    grant_type: "refresh_token",
    client_id: config.auth0BffClientId,
    client_secret: config.auth0BffClientSecret,
    refresh_token: refreshToken,
  });
}

/** Best-effort — failures are logged only, never thrown (fire-and-forget on logout). */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const resp = await fetch(`https://${config.auth0Domain}/oauth/revoke`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_id: config.auth0BffClientId,
        client_secret: config.auth0BffClientSecret,
        token: refreshToken,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) {
      console.warn("Token revocation returned non-200:", resp.status);
    }
  } catch (error) {
    console.error("Token revocation failed:", error);
  }
}

/**
 * Reads the id_token's payload without verifying its signature — deliberately,
 * per the Python service's own reasoning: it was just received directly from
 * Auth0 over TLS during code exchange (not attacker-controlled at this point)
 * and is only used to read profile display fields, never for authz decisions.
 */
export function parseIdTokenUnverified(idToken: string): Record<string, unknown> {
  const parts = idToken.split(".");
  if (parts.length < 2) return {};
  let payload = parts[1];
  const padNeeded = (4 - (payload.length % 4)) % 4;
  payload += "=".repeat(padNeeded);
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}
