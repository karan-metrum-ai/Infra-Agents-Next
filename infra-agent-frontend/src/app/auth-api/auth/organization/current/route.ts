import { NextRequest, NextResponse } from "next/server";
import { auth0Client } from "@/server/auth/auth0Client";
import { AuthError, extractClaims, orgToResponse } from "@/server/auth/session";

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
  if (!claims.sub) {
    return NextResponse.json({ detail: "No subject in token." }, { status: 401 });
  }

  try {
    const orgs = await auth0Client.getUserOrganizations(claims.sub);
    return NextResponse.json({ organization: orgs.length > 0 ? orgToResponse(orgs[0]) : null });
  } catch (error) {
    console.error("Failed to fetch user organizations:", error);
    return NextResponse.json({ organization: null });
  }
}
