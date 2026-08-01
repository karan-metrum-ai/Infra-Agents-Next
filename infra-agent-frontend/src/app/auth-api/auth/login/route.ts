import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { config } from "@/server/auth/config";
import { generatePkce, buildAuthorizeUrl } from "@/server/auth/oauth";
import { storePkceState } from "@/server/auth/pkceStore";

/** `screen_hint` is read by the Python source but never forwarded (self-signup is disabled). */
export async function GET() {
  const state = randomBytes(32).toString("base64url");
  const { codeVerifier, codeChallenge } = generatePkce();
  const redirectUri = `${config.bffBaseUrl}/auth-api/auth/callback`;

  try {
    await storePkceState(state, { codeVerifier, redirectUri });
  } catch (error) {
    console.error("Failed to store PKCE state:", error);
    return NextResponse.redirect(`${config.bffBaseUrl}/?auth_error=pkce_store_failed`);
  }

  return NextResponse.redirect(buildAuthorizeUrl(redirectUri, state, codeChallenge));
}
