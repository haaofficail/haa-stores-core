# ════════════════════════════════════════════════════════════════════
#  Haa Stores — Merchant Dashboard  (@haa/merchant-dashboard)
#  Build tool : Vite + tsc   |  Served by : nginx:alpine
#  Multi-stage : deps → build → prod
# ════════════════════════════════════════════════════════════════════

ARG NODE_VERSION=20
ARG ALPINE_VERSION=3.20
ARG NGINX_VERSION=1.27-alpine
ARG PNPM_VERSION=9

ARG VERSION=0.1.0
ARG MAINTAINER="Haa Stores DevOps <haa.officail@gmail.com>"

# ─────────────────────────────────────────────
# Stage 1 — deps: install workspace dependencies
# ─────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps

LABEL maintainer="${MAINTAINER}" \
      description="Merchant Dashboard — dependency stage"

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Copy workspace manifests first (cache-friendly layer)
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml      ./
COPY package.json        ./

# Copy every app/package package.json needed for workspace resolution
COPY apps/merchant-dashboard/package.json ./apps/merchant-dashboard/
COPY packages/                             ./packages/

# Install all deps (dev included — needed for Vite build)
RUN pnpm install --frozen-lockfile --prefer-offline


# ─────────────────────────────────────────────
# Stage 2 — build: compile TypeScript + Vite bundle
# ─────────────────────────────────────────────
FROM deps AS build

LABEL description="Merchant Dashboard — build stage"

# Copy shared packages source (workspace:* references)
COPY packages/ ./packages/

# Copy app source
COPY apps/merchant-dashboard/ ./apps/merchant-dashboard/

# Copy root tsconfig (app extends it)
COPY tsconfig.base.json ./
COPY tsconfig.json      ./

# Build: tsc -b && vite build → apps/merchant-dashboard/dist/
RUN pnpm --filter @haa/merchant-dashboard build


# ─────────────────────────────────────────────
# Stage 3 — prod: lightweight nginx image
# ─────────────────────────────────────────────
FROM nginx:${NGINX_VERSION} AS prod

ARG VERSION=0.1.0
ARG MAINTAINER="Haa Stores DevOps <haa.officail@gmail.com>"

LABEL maintainer="${MAINTAINER}" \
      version="${VERSION}" \
      description="Haa Stores Merchant Dashboard — production image" \
      org.opencontainers.image.title="haa-merchant-dashboard" \
      org.opencontainers.image.version="${VERSION}"

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled SPA assets from build stage
COPY --from=build /repo/apps/merchant-dashboard/dist /usr/share/nginx/html

# Inject custom nginx config (SPA routing + gzip + caching)
COPY apps/merchant-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

# nginx:alpine already runs as root to bind :80 but worker processes
# drop to the 'nginx' user automatically. Expose unprivileged port
# if you prefer rootless: set listen 8080 in nginx.conf and adjust.
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
