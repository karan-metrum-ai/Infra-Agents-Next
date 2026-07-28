/**
 * Cookie-aware `fetchBaseQuery` factory shared by every feature's RTK Query
 * API. In BFF mode the browser carries an httpOnly session cookie; no
 * Bearer token is injected. Nginx `auth_request` handles identity header
 * injection in production; in dev mode, identity headers are attached
 * client-side from the resolved session (see `authTokenProvider`).
 *
 * 401 responses redirect to the BFF login endpoint. 403 responses surface
 * as user-facing toast notifications.
 */

import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { toast } from "sonner";
import { getIdentity } from "@/lib/authTokenProvider";

let sessionId: string | null = null;
function getSessionCorrelationPrefix(): string {
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2, 10);
  }
  return sessionId;
}

let correlationSeq = 0;
function generateCorrelationId(): string {
  return `fe-${getSessionCorrelationPrefix()}-${Date.now()}-${++correlationSeq}`;
}

/** Paths that skip auth toasts / redirects. */
const PUBLIC_PATHS = ["/health", "/healthz", "/readyz"];

/** Paths handled by a specific component's own auth flow (e.g. AuthGuard). */
const NO_REDIRECT_PATHS = ["/auth/privacy-policy/acceptance"];

function isPublicPath(url: string): boolean {
  return PUBLIC_PATHS.some((p) => url === p || url.endsWith(p));
}

function shouldSkipRedirect(url: string): boolean {
  return NO_REDIRECT_PATHS.some((p) => url.includes(p));
}

const TOAST_COOLDOWN_MS = 4000;
let last401Toast = 0;
let last403Toast = 0;

export function showAuthToast(status: 401 | 403, detail?: string): void {
  const now = Date.now();

  if (status === 401) {
    if (now - last401Toast < TOAST_COOLDOWN_MS) return;
    last401Toast = now;
    toast.error("Session Expired", {
      description: "Your session has expired or is invalid. Redirecting to login...",
      duration: 4000,
    });
  } else {
    if (now - last403Toast < TOAST_COOLDOWN_MS) return;
    last403Toast = now;
    toast.warning("Access Denied", {
      description:
        detail ||
        "You do not have permission to perform this action. Contact your administrator if you believe this is an error.",
      duration: 6000,
    });
  }
}

function extractDetail(data: unknown): string | undefined {
  if (
    data &&
    typeof data === "object" &&
    "detail" in data &&
    typeof (data as Record<string, unknown>).detail === "string"
  ) {
    return (data as Record<string, string>).detail;
  }
  return undefined;
}

/**
 * Creates a cookie-aware base query for a given API base URL.
 *
 * Usage: `baseQuery: createBaseQuery('/api')`
 */
export function createBaseQuery(
  baseUrl: string,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    credentials: "include",
    prepareHeaders: (headers, { endpoint }) => {
      headers.set("accept", "application/json");
      headers.set("X-Correlation-ID", generateCorrelationId());

      const url = typeof endpoint === "string" ? endpoint : "";
      if (url && isPublicPath(url)) {
        return headers;
      }

      if (process.env.NODE_ENV === "development") {
        const identity = getIdentity();
        if (identity) {
          headers.set("x-forwarded-user", identity.userId);
          headers.set("x-forwarded-roles", identity.role);
          headers.set("x-forwarded-tenant", identity.tenantId);
        }
      }

      return headers;
    },
  });

  const authBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions,
  ) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    if (result.error) {
      const status = result.error.status;
      const requestUrl = typeof args === "string" ? args : args.url || "";

      if (status === 401) {
        if (!shouldSkipRedirect(requestUrl)) {
          showAuthToast(401);
          window.location.href = "/auth-api/auth/login";
        }
      } else if (status === 403) {
        showAuthToast(403, extractDetail(result.error.data));
      }
    }

    return result;
  };

  return authBaseQuery;
}
