import { NextRequest, NextResponse } from "next/server";
import { ensureSessionTokens, getSessionFromCookie } from "@/server/auth/session";

/** Backs nginx's `auth_request` in production — identity headers only, empty body. */
export async function GET(request: NextRequest) {
  let session = await getSessionFromCookie(request);
  if (!session) {
    return new NextResponse(null, { status: 401 });
  }
  session = await ensureSessionTokens(session);

  const headers: Record<string, string> = {
    "X-Forwarded-User": session.userId,
    "X-Forwarded-Roles": session.role,
    "X-Forwarded-Tenant": session.tenantId,
  };
  if (session.accessToken) headers["X-Access-Token"] = session.accessToken;

  return new NextResponse(null, { status: 200, headers });
}
