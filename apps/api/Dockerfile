# ════════════════════════════════════════════════════════════════════
#  Haa Stores — API Server  (@haa/api)
#  Runtime: Hono on Node.js   |  Build tool: tsc
#  Multi-stage: deps → build → prod
# ════════════════════════════════════════════════════════════════════

ARG NODE_VERSION=22
ARG ALPINE_VERSION=3.20
ARG PNPM_VERSION=10

# ── Label metadata ────────────────────────────────────────────────
ARG VERSION=0.1.0
ARG MAINTAINER="Haa Stores DevOps <haa.officail@gmail.com>"

# ─────────────────────────────────────────────
# Stage 1 — deps: install ALL workspace deps
# We copy only manifests first for optimal layer caching.
# ─────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps

# Re-declare build args — Docker ARGs before FROM are not visible inside stages
ARG PNPM_VERSION=10

LABEL maintainer="${MAINTAINER}" \
      version="${VERSION}" \
      description="Haa Stores API — dependency stage"

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Copy workspace manifests — changing any package.json busts this layer
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy every package.json in the monorepo (apps + packages)
# Using find to avoid manually listing each workspace member
COPY apps/api/package.json                  ./apps/api/
COPY apps/storefront/package.json           ./apps/storefront/
COPY apps/merchant-dashboard/package.json   ./apps/merchant-dashboard/
COPY apps/admin-dashboard/package.json      ./apps/admin-dashboard/
COPY packages/                              ./packages/

# Install all dependencies (frozen for reproducible builds)
RUN pnpm install --frozen-lockfile --prefer-offline


# ─────────────────────────────────────────────
# Stage 2 — build: compile TypeScript → dist/
# ─────────────────────────────────────────────
FROM deps AS build

LABEL description="Haa Stores API — build stage"

# Copy shared packages source (workspace:* deps)
COPY packages/ ./packages/

# Copy API source
COPY apps/api/ ./apps/api/

# Copy root tsconfig that apps/api extends
COPY tsconfig.base.json ./
COPY tsconfig.json      ./

# Build: tsc outputs to apps/api/dist/
RUN pnpm -r --filter './packages/**' --workspace-concurrency=1 build
RUN pnpm --filter @haa/api build


# ─────────────────────────────────────────────
# Stage 3 — prod: lean production image
# ─────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS prod

ARG VERSION=0.1.0
ARG MAINTAINER="Haa Stores DevOps <haa.officail@gmail.com>"
ARG PNPM_VERSION=10

LABEL maintainer="${MAINTAINER}" \
      version="${VERSION}" \
      description="Haa Stores API — production image" \
      org.opencontainers.image.title="haa-api" \
      org.opencontainers.image.version="${VERSION}"

# Install runtime OS deps (curl needed for HEALTHCHECK)
RUN apk add --no-cache curl dumb-init

# Enable pnpm for prod install
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /app

# Copy workspace manifests for production install
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml      ./
COPY package.json        ./
COPY apps/api/package.json                  ./apps/api/
COPY apps/storefront/package.json           ./apps/storefront/
COPY apps/merchant-dashboard/package.json   ./apps/merchant-dashboard/
COPY apps/admin-dashboard/package.json      ./apps/admin-dashboard/
COPY packages/                              ./packages/

# Install ONLY production dependencies. Lifecycle scripts are skipped because
# the root prepare hook uses Husky, which is intentionally a devDependency.
RUN pnpm install --frozen-lockfile --prod --prefer-offline --ignore-scripts

# Copy compiled output from build stage
COPY --from=build /repo/apps/api/dist ./apps/api/dist

# Copy package sources needed at runtime (workspace:* packages)
# These were already copied via packages/ above

# Security: drop to non-root user
# node user (uid 1000) already exists in node:alpine
RUN chown -R node:node /app
USER node

# Expose API port (default 3001, override via PORT env)
EXPOSE 3001

ENV NODE_ENV=production \
    PORT=3001

# Healthcheck — hits /health endpoint every 30 s
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fs http://localhost:${PORT:-3001}/health || exit 1

# Use dumb-init as PID 1 to handle signals correctly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/index.js"]
