/**
 * Bearer access-token validation — ported from
 * `infra_agents/auth/client/jwt_validator.py`. Only used by the Bearer
 * fallback path in `extractClaims` (the cookie-session path never needs
 * this — its claims come straight from server-side session state).
 */
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { config } from "@/server/auth/config";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksDomain = "";

function getJwks() {
  if (!jwks || jwksDomain !== config.auth0Domain) {
    jwksDomain = config.auth0Domain;
    jwks = createRemoteJWKSet(new URL(`https://${config.auth0Domain}/.well-known/jwks.json`));
  }
  return jwks;
}

/** Throws on any validation failure (bad signature, wrong aud/iss, expired). */
export async function validateAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getJwks(), {
    algorithms: ["RS256"],
    audience: config.auth0Audience || undefined,
    issuer: `https://${config.auth0Domain}/`,
  });
  return payload;
}
