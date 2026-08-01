import { NextRequest, NextResponse } from "next/server";
import { config, getCookieDomain, isCookieSecure } from "@/server/auth/config";

const TEST_COOKIE_NAME = "ia_cookie_test";

/** Diagnostic endpoint — ported as-is, matching the Python source's own zero-auth-gating design. */
export async function GET(request: NextRequest) {
  const testValue = request.cookies.get(TEST_COOKIE_NAME)?.value;

  const base = {
    timestamp: new Date().toISOString(),
    request: {
      origin: request.headers.get("origin") ?? "not-set",
      host: request.headers.get("host") ?? "not-set",
      referer: request.headers.get("referer") ?? "not-set",
      all_cookies: request.cookies.getAll().map((c) => c.name),
    },
    config: {
      bff_base_url: config.bffBaseUrl,
      cookie_domain: getCookieDomain() ?? "(host-only)",
      cookie_secure: isCookieSecure(),
    },
  };

  if (testValue) {
    return NextResponse.json({
      ...base,
      test_result: "SUCCESS",
      test_cookie_received: true,
      test_cookie_value: testValue,
      message:
        "Cookie round-trip works! The browser successfully sent the test cookie back to the server.",
    });
  }

  const response = NextResponse.json({
    ...base,
    test_result: "COOKIE_SET",
    test_cookie_received: false,
    message:
      "Test cookie has been set. Refresh this page or call this endpoint again. If the cookie round-trip works, you will see test_result: SUCCESS. If not, there is a cookie issue.",
    next_step:
      "Call this endpoint again (refresh page) to verify the cookie was stored and sent back.",
  });
  response.cookies.set(TEST_COOKIE_NAME, `test_${Math.floor(Date.now() / 1000)}`, {
    httpOnly: true,
    secure: isCookieSecure(),
    sameSite: "lax",
    path: "/",
    domain: getCookieDomain(),
    maxAge: 300,
  });
  return response;
}
