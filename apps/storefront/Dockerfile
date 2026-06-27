# ════════════════════════════════════════════════════════════════════
#  Haa Stores — Storefront (@haa/storefront)
#  Runtime: Node.js + serve   |  Build tool: Vite
#  Multi-stage: deps → build → prod
# ════════════════════════════════════════════════════════════════════

ARG NODE_VERSION=22
ARG ALPINE_VERSION=3.20
ARG PNPM_VERSION=10

# ─────────────────────────────────────────────────────────────────────
# Stage 1 — deps: install dependencies
# ─────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps

ARG PNPM_VERSION=10

LABEL description="Haa Stores Storefront — dependency stage"

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Copy workspace manifests
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/storefront/package.json ./apps/storefront/
COPY packages/ ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile --prefer-offline

# ─────────────────────────────────────────────────────────────────────
# Stage 2 — build: compile with Vite
# ─────────────────────────────────────────────────────────────────────
FROM deps AS build

LABEL description="Haa Stores Storefront — build stage"

# Copy source
COPY . .

# Bake the API base URL into the SPA bundle. Staging/prod build with
# VITE_API_URL=/api so API calls hit the reverse proxy's API route instead
# of colliding with the SPA's own page routes on the same origin.
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Build shared packages first
RUN pnpm -r --filter './packages/**' --workspace-concurrency=1 build

# Build storefront
RUN pnpm --filter @haa/storefront build

# ─────────────────────────────────────────────────────────────────────
# Stage 3 — prod: lean runtime image
# ─────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS prod

ARG VERSION=0.1.0
ARG MAINTAINER="Haa Stores DevOps <haa.officail@gmail.com>"

LABEL maintainer="${MAINTAINER}" \
      version="${VERSION}" \
      description="Haa Stores Storefront — production image" \
      org.opencontainers.image.title="haa-storefront" \
      org.opencontainers.image.version="${VERSION}"

# Install runtime deps
RUN apk add --no-cache curl dumb-init

# Install serve globally
RUN npm install -g serve@^14

WORKDIR /app

# Copy dist from build stage
COPY --from=build /repo/apps/storefront/dist ./dist

# Run as the built-in non-root `node` user (uid/gid 1000 already exist in node:alpine)
RUN chown -R node:node /app
USER node

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fs http://localhost:3001/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["serve", "-s", "dist", "-l", "3001"]
