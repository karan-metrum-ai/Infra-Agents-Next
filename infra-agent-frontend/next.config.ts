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
        // Dev-only convenience: proxies to a locally running auth BFF.
        // In production this is unreachable — nginx's `/auth-api/` location
        // (see infra-agent-frontend/nginx.conf) intercepts and forwards to
        // the real auth service before the request ever reaches Next.
        source: "/auth-api/:path*",
        destination: "http://localhost:3001/:path*",
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
