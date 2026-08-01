import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Minimal, self-contained runtime image for Docker (Phase 18) — copies
  // only `.next/standalone` + `.next/static` + `public/`, not the full
  // `node_modules`/source tree. See self-hosting.md's Docker Standalone
  // Output guidance.
  output: "standalone",
  async rewrites() {
    // Dev-only convenience: production nginx proxies these prefixes through
    // a cluster gateway that mounts both services under `/onboarding/`.
    // Locally we port-forward each service separately and split by path —
    // infra-agents-api owns most `/command-center/*` cards; onboarding-agent
    // owns globe sites + digital-twin topology + bulk-upload.
    const BACKEND_UPSTREAM = "http://localhost:28019"; // infra-agents-api, kubectl port-forward 28019:8019
    const ONBOARDING_UPSTREAM = "http://localhost:28005"; // onboarding-agent, kubectl port-forward 28005:8005
    const UPTIME_MONITOR_UPSTREAM = "http://localhost:8030"; // uptime-monitor, kubectl port-forward 8030:8030
    const CLUSTER_ID = process.env.CLUSTER_ID || "8001";

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
      // `/health` is mounted bare (unauthenticated) on this backend, not under
      // any prefix — a specific rule ahead of the general `/api/:path*` one below.
      { source: "/api/health", destination: `${BACKEND_UPSTREAM}/health` },

      // Onboarding-agent surfaces (globe sites, topology, bulk-upload, metrics).
      // More-specific `/digital-twin-api/...` rules must precede the catch-all.
      {
        source: "/digital-twin-api/command-center/sites",
        destination: `${ONBOARDING_UPSTREAM}/command-center/sites`,
      },
      {
        source: "/digital-twin-api/devices/:path*",
        destination: `${ONBOARDING_UPSTREAM}/devices/:path*`,
      },
      {
        source: "/digital-twin-api/bulk-upload/:path*",
        destination: `${ONBOARDING_UPSTREAM}/bulk-upload/:path*`,
      },
      {
        source: "/digital-twin-api/metrics/:path*",
        destination: `${ONBOARDING_UPSTREAM}/metrics/:path*`,
      },
      {
        source: "/digital-twin-api/cooling/:path*",
        destination: `${ONBOARDING_UPSTREAM}/cooling/:path*`,
      },
      {
        source: "/digital-twin-api/ssd/:path*",
        destination: `${ONBOARDING_UPSTREAM}/ssd/:path*`,
      },
      // Remaining digital-twin-api (CC agent-activity / health / tickets /
      // incidents) → infra-agents-api. Local Casbin allows bare
      // `/command-center/*` and denies `/onboarding/command-center/*`.
      { source: "/digital-twin-api/:path*", destination: `${BACKEND_UPSTREAM}/:path*` },

      { source: "/onboarding-api/:path*", destination: `${ONBOARDING_UPSTREAM}/:path*` },
      // teamsApi / onboardingApi hit bulk-upload under `/api`.
      {
        source: "/api/bulk-upload/:path*",
        destination: `${ONBOARDING_UPSTREAM}/bulk-upload/:path*`,
      },
      { source: "/api/:path*", destination: `${BACKEND_UPSTREAM}/:path*` },
      { source: "/kyai/:path*", destination: `${BACKEND_UPSTREAM}/kyai/:path*` },
      {
        source: "/report-api/:path*",
        destination: `${BACKEND_UPSTREAM}/clusterid-${CLUSTER_ID}/report-api/:path*`,
      },
      { source: "/uptime-api/:path*", destination: `${UPTIME_MONITOR_UPSTREAM}/:path*` },
      // Cluster-scoped endpoints (e.g. `useAgentTeamHealth`'s
      // `/clusterid-{id}/health` poll) — nginx.conf passes these through to
      // BACKEND_UPSTREAM unchanged (`location ~ ^/clusterid-[0-9]+`).
      { source: "/clusterid-:id/:path*", destination: `${BACKEND_UPSTREAM}/clusterid-:id/:path*` },
      // /sandbox-api intentionally not rewired — no local port-forward for
      // the sandbox evaluator service is currently up on this machine (the
      // docker-compose default is a NodePort at :30825). Add one and a
      // matching rewrite here when Sandbox work needs it locally.
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
