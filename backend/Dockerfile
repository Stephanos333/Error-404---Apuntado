# syntax=docker/dockerfile:1
# NestJS backend (REST + WebSockets) of the Apuntado system. Multi-stage build:
#  1. deps:    installs every dependency (including the build ones).
#  2. build:   compiles TypeScript (src/ and plugins/) and prunes the development dependencies.
#  3. runtime: minimal image with dist/ and the production node_modules, as an unprivileged user.

ARG NODE_VERSION=20.18-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
# mongodb-memory-server (tests only) must not download the MongoDB binary on install.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY plugins ./plugins
RUN npm run build && npm prune --omit=dev

FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    APP_PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
# Health: the OpenAPI documentation only answers once the application has finished starting.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.APP_PORT || 3000) + '/' + (process.env.APP_DOCS_URI || 'docs')).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/src/main"]
