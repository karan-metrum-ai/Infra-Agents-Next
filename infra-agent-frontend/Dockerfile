# Multi-stage build producing a minimal `output: "standalone"` runtime image
# (Phase 18 of CLAUDE.md) — replaces the Vite app's "build to dist/, serve
# with nginx" Dockerfile. This app is a Next.js *server* (SSR/streaming for
# dynamic routes like /dashboard/live/teams, /kyai/sessions/[id],
# /sandbox/runs/[runId]), not a static SPA, so nginx now reverse-proxies to
# this container instead of serving files directly — see nginx.conf's
# `location /` and docker-compose.yml's two-service split.

FROM node:20-alpine AS deps

# npm registry mirror (matches the Vite app's own Dockerfile convention).
# Override when npmjs.org is reachable: docker compose build --build-arg NPM_REGISTRY=
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY}

RUN npm config set registry "$NPM_REGISTRY" \
    && corepack enable \
    && corepack prepare pnpm@10.6.2 --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@10.6.2 --activate
RUN pnpm build

# Production runtime: only the standalone server + static assets, no
# node_modules install, no source tree, no build tooling.
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
