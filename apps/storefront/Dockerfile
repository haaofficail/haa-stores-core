# ════════════════════════════════════════════════════════════════════
#  Haa Stores — Storefront  (@haa/storefront)
#  Build tool : Vite + tsc   |  Served by : nginx:alpine
#  Multi-stage : deps → build → prod
# ════════════════════════════════════════════════════════════════════

ARG NODE_VERSION=22
ARG ALPINE_VERSION=3.20
ARG NGINX_VERSION=1.27-alpine
ARG PNPM_VERSION=10

ARG VERSION=0.1.0
ARG MAINTAINER="Haa Stores DevOps <haa.officail@gmail.com>"

# ─────────────────────────────────────────────
# Stage 1 — deps
# ─────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps

# Re-declare build args — Docker ARGs before FROM are not visible inside stages
ARG PNPM_VERSION=10

LABEL maintainer="${MAINTAINER}" \
      description="Storefront — dependency stage"

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml      ./
COPY package.json        ./

COPY apps/storefront/package.json ./apps/storefront/
COPY packages/                     ./packages/

RUN pnpm install --frozen-lockfile --prefer-offline


# ─────────────────────────────────────────────
# Stage 2 — build
# ─────────────────────────────────────────────
FROM deps AS build

LABEL description="Storefront — build stage"

COPY packages/ ./packages/
COPY apps/storefront/ ./apps/storefront/
COPY tsconfig.base.json ./
COPY tsconfig.json      ./

RUN pnpm --filter @haa/storefront build


# ─────────────────────────────────────────────
# Stage 3 — prod
# ─────────────────────────────────────────────
FROM nginx:${NGINX_VERSION} AS prod

ARG VERSION=0.1.0
ARG MAINTAINER="Haa Stores DevOps <haa.officail@gmail.com>"

LABEL maintainer="${MAINTAINER}" \
      version="${VERSION}" \
      description="Haa Stores Storefront — production image" \
      org.opencontainers.image.title="haa-storefront" \
      org.opencontainers.image.version="${VERSION}"

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /repo/apps/storefront/dist /usr/share/nginx/html
COPY apps/storefront/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
