# syntax=docker/dockerfile:1
# Backend NestJS (REST + WebSockets) del Sistema Apuntado. Build multi-stage:
#  1. deps:    instala todas las dependencias (incluye las de compilación).
#  2. build:   compila TypeScript (src/ y plugins/) y poda las dependencias de desarrollo.
#  3. runtime: imagen mínima con dist/ y node_modules de producción, como usuario sin privilegios.

ARG NODE_VERSION=20.18-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
# mongodb-memory-server (solo pruebas) no debe descargar el binario de MongoDB al instalar.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json ./
RUN npm install --no-audit --no-fund

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
# Salud: la documentación OpenAPI solo responde cuando la aplicación terminó de arrancar.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.APP_PORT || 3000) + '/' + (process.env.APP_DOCS_URI || 'docs')).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/src/main"]
