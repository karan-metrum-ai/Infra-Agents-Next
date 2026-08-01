import { NextRequest, NextResponse } from "next/server";
import { auth0Client, type Auth0Organization, type Auth0Role } from "@/server/auth/auth0Client";
import { auditRecord } from "@/server/auth/auditLog";
import { AuthError, ensureDefaultRole, extractClaims, orgToResponse } from "@/server/auth/session";

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

  let user, orgs, roles;
  try {
    [user, orgs, roles] = await Promise.all([
      auth0Client.getUser(claims.sub),
      auth0Client.getUserOrganizations(claims.sub),
      auth0Client.getUserRoles(claims.sub),
    ]);
  } catch (exc) {
    return NextResponse.json({ detail: `Failed to fetch profile: ${exc}` }, { status: 502 });
  }

  let roleNames = roles.map((r) => r.name);
  if (roleNames.length === 0) {
    const effectiveRole = await ensureDefaultRole(claims.sub);
    try {
      const refetched = await auth0Client.getUserRoles(claims.sub);
      roleNames = refetched.length > 0 ? refetched.map((r) => r.name) : [effectiveRole];
    } catch {
      roleNames = [effectiveRole];
    }
  }

  return NextResponse.json({
    user_id: claims.sub,
    email: user.email ?? null,
    name: user.name ?? null,
    picture: user.picture ?? null,
    organization: orgs.length > 0 ? orgToResponse(orgs[0]) : null,
    roles: roleNames.length > 0 ? roleNames : null,
  });
}

export async function PATCH(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const fields: Record<string, unknown> = {};
  if (body.name !== undefined && body.name !== null) fields.name = body.name;
  if (body.picture !== undefined && body.picture !== null) fields.picture = body.picture;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ detail: "No fields to update." }, { status: 400 });
  }

  let updatedUser;
  try {
    updatedUser = await auth0Client.updateUser(claims.sub, fields);
  } catch (exc) {
    void auditRecord({
      eventType: "USER_PROFILE_UPDATED",
      eventCategory: "user_lifecycle",
      outcome: "failure",
      organizationId: claims.tenant_id ?? null,
      actorRole: claims.role ?? null,
      userId: claims.sub,
      target: claims.sub,
      targetType: "user",
      details: { fields: Object.keys(fields), error: String(exc) },
    });
    return NextResponse.json({ detail: `Failed to update profile: ${exc}` }, { status: 502 });
  }

  void auditRecord({
    eventType: "USER_PROFILE_UPDATED",
    eventCategory: "user_lifecycle",
    outcome: "success",
    organizationId: claims.tenant_id ?? null,
    actorRole: claims.role ?? null,
    userId: claims.sub,
    target: claims.sub,
    targetType: "user",
    details: { fields: Object.keys(fields) },
  });

  let orgs: Auth0Organization[] = [];
  let roles: Auth0Role[] = [];
  try {
    [orgs, roles] = await Promise.all([
      auth0Client.getUserOrganizations(claims.sub),
      auth0Client.getUserRoles(claims.sub),
    ]);
  } catch {
    // Swallowed — matches the Python source (no error raised even though this is post-audit).
  }

  return NextResponse.json({
    user_id: claims.sub,
    email: updatedUser.email ?? null,
    name: updatedUser.name ?? null,
    picture: updatedUser.picture ?? null,
    organization: orgs.length > 0 ? orgToResponse(orgs[0]) : null,
    roles: roles.length > 0 ? roles.map((r) => r.name) : null,
  });
}
