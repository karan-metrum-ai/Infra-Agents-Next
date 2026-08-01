/**
 * Signed session-cookie value: a clean-room equivalent of the Python
 * service's `itsdangerous.URLSafeTimedSerializer` (opaque signed session id
 * + timestamp, HMAC-verified, expiry enforced via `maxAgeSeconds`). Not
 * byte-compatible with itsdangerous output — this is a full backend swap,
 * so old cookies are expected to be invalidated (users simply log in again),
 * not read cross-implementation.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { config, getCookieDomain, isCookieSecure } from "@/server/auth/config";

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signSessionId(sessionId: string): string {
  const secret = config.sessionSecret || "insecure-dev-key";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = `${Buffer.from(sessionId, "utf8").toString("base64url")}.${timestamp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function unsignSessionId(cookieValue: string, maxAgeSeconds: number): string | null {
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [sidPart, timestampPart, signaturePart] = parts;
  const secret = config.sessionSecret || "insecure-dev-key";
  const payload = `${sidPart}.${timestampPart}`;
  const expectedSig = sign(payload, secret);

  const a = Buffer.from(signaturePart);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const timestamp = Number.parseInt(timestampPart, 10);
  if (!Number.isFinite(timestamp)) return null;
  if (Math.floor(Date.now() / 1000) - timestamp > maxAgeSeconds) return null;

  try {
    return Buffer.from(sidPart, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export interface CookieAttributes {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  domain?: string;
  maxAge: number;
}

export function sessionCookieAttributes(): CookieAttributes {
  return {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: "lax",
    path: "/",
    domain: getCookieDomain(),
    maxAge: config.sessionMaxAge,
  };
}
