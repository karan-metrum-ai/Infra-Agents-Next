import { NextRequest, NextResponse } from "next/server";
import { auth0Client } from "@/server/auth/auth0Client";
import { AuthError, extractClaims } from "@/server/auth/session";

export async function GET(request: NextRequest) {
  let claims;
  try {
    claims = await extractClaims(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    throw error;
  }
  if (!claims.sub) return NextResponse.json({ detail: "No subject in token." }, { status: 401 });

  let methods;
  try {
    methods = await auth0Client.getUserAuthenticationMethods(claims.sub);
  } catch (exc) {
    return NextResponse.json({ detail: `Failed to fetch MFA status: ${exc}` }, { status: 502 });
  }

  return NextResponse.json({
    totp_enrolled: methods.some((m) => m.type === "totp" && m.confirmed),
    recovery_code_enrolled: methods.some((m) => m.type === "recovery-code" && m.confirmed),
    methods: methods.map((m) => ({
      id: m.id,
      type: m.type,
      confirmed: m.confirmed,
      name: m.name ?? null,
      created_at: m.created_at ?? null,
    })),
  });
}
