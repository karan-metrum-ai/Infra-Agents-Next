/**
 * Auth API (BFF mode) — session bootstrap and login/logout redirects.
 *
 * All calls use `credentials: 'include'` to send the httpOnly session
 * cookie; the browser never sees tokens. This hits the auth-BFF origin
 * directly rather than going through the main app's `baseQuery` (Phase 3),
 * since session bootstrap has to work before any tenant/API context exists.
 */

import { createApi } from "@reduxjs/toolkit/query/react";
import { clearTokenGetter, registerIdentity } from "@/lib/authTokenProvider";
import { normalizeRole } from "@/features/auth/authSelectors";
import { type SessionResponse, sessionResponseSchema } from "@/schemas/session.schema";

const AUTH_SESSION_URL = "/auth-api/auth/session";
const SESSION_CHECK_MAX_RETRIES = 3;
const SESSION_CHECK_RETRY_DELAY_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const UNAUTHENTICATED_SESSION: SessionResponse = { authenticated: false };

async function fetchSessionWithRetry(): Promise<SessionResponse> {
  for (let attempt = 0; attempt < SESSION_CHECK_MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(AUTH_SESSION_URL, { credentials: "include" });

      if (resp.status >= 500 && attempt < SESSION_CHECK_MAX_RETRIES - 1) {
        await delay(SESSION_CHECK_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      if (!resp.ok) {
        return UNAUTHENTICATED_SESSION;
      }

      const parsed = sessionResponseSchema.parse(await resp.json());
      if (!parsed.authenticated) {
        return UNAUTHENTICATED_SESSION;
      }

      registerIdentity({
        userId: parsed.user?.sub ?? "",
        role: normalizeRole(parsed.role ?? ""),
        tenantId: parsed.tenant_id ?? "",
      });

      return parsed;
    } catch (error) {
      if (attempt < SESSION_CHECK_MAX_RETRIES - 1) {
        await delay(SESSION_CHECK_RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      throw error;
    }
  }

  return UNAUTHENTICATED_SESSION;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: () => ({ data: undefined }),
  tagTypes: ["Session"],
  endpoints: (builder) => ({
    getSession: builder.query<SessionResponse, void>({
      queryFn: async () => {
        try {
          return { data: await fetchSessionWithRetry() };
        } catch (error) {
          return { error: { status: "FETCH_ERROR", error: String(error) } };
        }
      },
      providesTags: ["Session"],
    }),
  }),
});

export const { useGetSessionQuery } = authApi;

/** Redirects to the BFF login endpoint (full-page redirect, cookie-based). */
export function login(): void {
  window.location.href = "/auth-api/auth/login";
}

/** Clears local identity, then redirects to the BFF logout endpoint. */
export function logout(): void {
  clearTokenGetter();
  window.location.href = "/auth-api/auth/logout";
}
