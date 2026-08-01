import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Minimal, self-contained runtime image for Docker (Phase 18) — copies
  // only `.next/standalone` + `.next/static` + `public/`, not the full
  // `node_modules`/source tree. See self-hosting.md's Docker Standalone
  // Output guidance.
  output: "standalone",
  async rewrites() {
    return [
      {
        // The auth BFF itself (login/callback/session/logout/verify/health/
        // organization/user/mfa/admin) is now served natively by
        // `src/app/auth-api/auth/**` Route Handlers — no proxy needed.
        // Only the privacy-policy sub-router (part of the separate
        // `infra_agents.compliance` Python package, not yet ported) still
        // proxies to the standalone auth service.
        source: "/auth-api/auth/privacy-policy/:path*",
        destination: "http://localhost:3001/auth/privacy-policy/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        // Lets nginx (or any reverse proxy) know not to buffer streaming
        // responses (Suspense/loading.tsx boundaries, SSE-adjacent routes)
        // per self-hosting.md's "Streaming and Suspense" guidance.
        source: "/:path*{/}?",
        headers: [{ key: "X-Accel-Buffering", value: "no" }],
      },
    ];
  },
};

export default nextConfig;
