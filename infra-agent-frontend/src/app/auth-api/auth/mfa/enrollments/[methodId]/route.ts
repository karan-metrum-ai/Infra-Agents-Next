import { NextRequest, NextResponse } from "next/server";
import { auth0Client } from "@/server/auth/auth0Client";
import { auditRecord } from "@/server/auth/auditLog";
import { AuthError, extractClaims } from "@/server/auth/session";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ methodId: string }> },
) {
  const { methodId } = await params;

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

  try {
    // Always scoped to the calling user's own account (claims.sub), matching the Python source —
    // method_id alone can't be used to target another user's MFA enrollment.
    await auth0Client.deleteUserAuthenticationMethod(claims.sub, methodId);
  } catch (exc) {
    void auditRecord({
      eventType: "MFA_REVOKED",
      eventCategory: "user_lifecycle",
      outcome: "failure",
      userId: claims.sub,
      organizationId: claims.tenant_id ?? null,
      actorRole: claims.role ?? null,
      target: methodId,
      targetType: "mfa_method",
      details: { error: String(exc) },
    });
    return NextResponse.json(
      { detail: `Failed to delete MFA enrollment: ${exc}` },
      { status: 502 },
    );
  }

  void auditRecord({
    eventType: "MFA_REVOKED",
    eventCategory: "user_lifecycle",
    outcome: "success",
    userId: claims.sub,
    organizationId: claims.tenant_id ?? null,
    actorRole: claims.role ?? null,
    target: methodId,
    targetType: "mfa_method",
  });

  return new NextResponse(null, { status: 204 });
}
