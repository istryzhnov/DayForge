# syntax=docker/dockerfile:1

# Pinned to an exact version AND an immutable digest: the tag documents what it
# is, the digest guarantees the bytes never change under us.
ARG NODE_IMAGE=node:22.23.2-alpine3.24@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32
ARG NGINX_IMAGE=nginxinc/nginx-unprivileged:1.31.5-alpine@sha256:aa8c9087d36d93e9d650c5365f883b421e8214aedbad24ade52b844c583358f1

# ---------- deps: install once, reuse in dev and build ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# Only the manifests, so this layer is cached until dependencies actually change
COPY package.json package-lock.json ./
RUN npm ci

# ---------- dev: vite dev server + HMR ----------
FROM ${NODE_IMAGE} AS dev
WORKDIR /app
ENV NODE_ENV=development
# `node` is uid 1000 in this image, matching a typical Linux host user, so the
# bind-mounted source stays writable
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

# ---------- build: type-check + emit static bundle ----------
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- prod: nginx serving dist/, no node runtime in the image ----------
# nginx-unprivileged runs as uid 101 and listens on 8080, so the container needs
# no root and no NET_BIND_SERVICE capability.
FROM ${NGINX_IMAGE} AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
