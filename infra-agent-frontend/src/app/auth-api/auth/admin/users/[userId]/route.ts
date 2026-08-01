import { NextRequest, NextResponse } from "next/server";
import { auth0Client } from "@/server/auth/auth0Client";
import { auditRecord } from "@/server/auth/auditLog";
import { AuthError, extractClaims } from "@/server/auth/session";

const ADMIN_ROLES = new Set(["platform_admin", "admin", "tenant_admin"]);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  let claims;
  try {
    claims = await extractClaims(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    throw error;
  }

  const actorRole = (claims.role ?? "").toLowerCase();
  if (!ADMIN_ROLES.has(actorRole)) {
    void auditRecord({
      eventType: "USER_DELETED",
      eventCategory: "user_lifecycle",
      outcome: "denied",
      userId: claims.sub,
      organizationId: claims.tenant_id ?? null,
      actorRole,
      target: userId,
      targetType: "user",
      details: { reason: "insufficient_role" },
    });
    return NextResponse.json({ detail: "Admin role required to delete users." }, { status: 403 });
  }

  try {
    // Single DELETE call — matches the Python source's actual behavior, not its
    // docstring (which overstates it as also removing org memberships first).
    await auth0Client.deleteUser(userId);
  } catch (exc) {
    void auditRecord({
      eventType: "USER_DELETED",
      eventCategory: "user_lifecycle",
      outcome: "failure",
      userId: claims.sub,
      organizationId: claims.tenant_id ?? null,
      actorRole,
      target: userId,
      targetType: "user",
      details: { error: String(exc) },
    });
    return NextResponse.json({ detail: `Failed to delete user: ${exc}` }, { status: 502 });
  }

  void auditRecord({
    eventType: "USER_DELETED",
    eventCategory: "user_lifecycle",
    outcome: "success",
    userId: claims.sub,
    organizationId: claims.tenant_id ?? null,
    actorRole,
    target: userId,
    targetType: "user",
  });

  return new NextResponse(null, { status: 204 });
}
