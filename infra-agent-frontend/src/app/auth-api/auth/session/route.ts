import { NextRequest, NextResponse } from "next/server";
import { auth0Client } from "@/server/auth/auth0Client";
import {
  ensureSessionTokens,
  getSessionFromCookie,
  orgToResponse,
  refreshSessionRole,
} from "@/server/auth/session";

export async function GET(request: NextRequest) {
  let session = await getSessionFromCookie(request);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  session = await ensureSessionTokens(session);
  session = await refreshSessionRole(session);

  let organization = null;
  if (session.tenantId) {
    try {
      organization = orgToResponse(await auth0Client.getOrganization(session.tenantId));
    } catch (error) {
      console.error("Failed to fetch organization for session:", error);
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      sub: session.userId,
      email: session.email,
      name: session.name,
      picture: session.picture,
    },
    organization,
    role: session.role,
    tenant_id: session.tenantId,
  });
}
