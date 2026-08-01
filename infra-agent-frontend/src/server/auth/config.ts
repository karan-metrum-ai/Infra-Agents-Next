/**
 * Auth-API configuration — ported 1:1 from `infra_agents/auth/client/config.py`.
 * Same env var names/defaults so existing `.env` values carry over unchanged.
 */

function parseBoolEnv(value: string | undefined): boolean | null {
  if (value === undefined || value === "") return null;
  return ["true", "1", "yes"].includes(value.toLowerCase());
}

export interface AuthConfig {
  auth0Domain: string;
  auth0Audience: string;
  auth0M2mClientId: string;
  auth0M2mClientSecret: string;
  auth0DefaultOrgId: string;
  auth0ViewerRoleId: string;
  auth0BffClientId: string;
  auth0BffClientSecret: string;
  sessionSecret: string;
  sessionCookieName: string;
  sessionMaxAge: number;
  cookieDomain: string;
  cookieSecureOverride: boolean | null;
  redisUrl: string;
  redisKeyPrefix: string;
  bffBaseUrl: string;
  complianceDbUrl: string;
}

function loadConfig(): AuthConfig {
  return {
    auth0Domain: process.env.AUTH0_DOMAIN ?? "",
    auth0Audience: process.env.AUTH0_AUDIENCE ?? "",
    auth0M2mClientId: process.env.AUTH0_M2M_CLIENT_ID ?? "",
    auth0M2mClientSecret: process.env.AUTH0_M2M_CLIENT_SECRET ?? "",
    auth0DefaultOrgId: process.env.AUTH0_DEFAULT_ORG_ID ?? "",
    auth0ViewerRoleId: process.env.AUTH0_VIEWER_ROLE_ID ?? "",
    auth0BffClientId: process.env.AUTH0_BFF_CLIENT_ID ?? "",
    auth0BffClientSecret: process.env.AUTH0_BFF_CLIENT_SECRET ?? "",
    sessionSecret: process.env.SESSION_SECRET ?? "",
    sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "ia_session",
    sessionMaxAge: Number.parseInt(process.env.SESSION_MAX_AGE ?? "2592000", 10),
    cookieDomain: process.env.COOKIE_DOMAIN ?? "",
    cookieSecureOverride: parseBoolEnv(process.env.COOKIE_SECURE_OVERRIDE),
    redisUrl: process.env.REDIS_URL ?? "",
    redisKeyPrefix: process.env.REDIS_KEY_PREFIX ?? "ia:session:",
    bffBaseUrl: process.env.BFF_BASE_URL ?? "http://localhost:5173",
    complianceDbUrl: process.env.COMPLIANCE_DB_URL ?? process.env.DB_URL ?? "",
  };
}

/** Module-level singleton, same as the Python service's process-lifetime `config`. */
export const config: AuthConfig = loadConfig();

export function getCookieDomain(): string | undefined {
  if (config.cookieDomain) return config.cookieDomain;
  try {
    const host = new URL(config.bffBaseUrl).hostname;
    if (host === "localhost" || host === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return undefined;
    }
    return host;
  } catch {
    return undefined;
  }
}

export function isCookieSecure(): boolean {
  if (config.cookieSecureOverride !== null) return config.cookieSecureOverride;
  return config.bffBaseUrl.startsWith("https");
}
