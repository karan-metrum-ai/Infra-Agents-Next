import { NextRequest, NextResponse } from "next/server";
import { auth0Client } from "@/server/auth/auth0Client";
import { AuthError, extractClaims, orgToResponse, resolveUserOrg } from "@/server/auth/session";

export async function POST(request: NextRequest) {
  let claims;
  try {
    claims = await extractClaims(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message }, { status: error.status });
    }
    throw error;
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const userId = (body.user_id as string | undefined) || claims.sub;
  if (!userId) {
    return NextResponse.json({ detail: "No user_id provided." }, { status: 400 });
  }

  let org, isNewMember;
  try {
    ({ org, isNewMember } = await resolveUserOrg(userId));
  } catch (exc) {
    return NextResponse.json({ detail: `Failed to resolve organization: ${exc}` }, { status: 502 });
  }
  if (!org) {
    return NextResponse.json({ detail: "No organization found for this user." }, { status: 404 });
  }

  let roleNames: string[] = [];
  try {
    roleNames = (await auth0Client.getUserRoles(userId)).map((r) => r.name);
  } catch {
    roleNames = [];
  }

  return NextResponse.json({
    organization: orgToResponse(org),
    is_new_org: false,
    is_new_member: isNewMember,
    membership: { user_id: userId, organization_id: org.id, roles: roleNames },
  });
}
