# syntax=docker/dockerfile:1
# React (Vite) frontend of the Apuntado system. Multi-stage build:
#  1. build:   installs with the yarn.lock (reproducible) and builds the static files with `tsc && vite build`.
#  2. runtime: Nginx serves the SPA and acts as a reverse proxy to the backend (/api, /socket.io, /docs),
#              so browser and API share the origin and the backend URL does not have to be fixed in the image.

ARG NODE_VERSION=20.18-alpine

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --network-timeout 600000
COPY . .
# Vite variables: embedded in the bundle at build time.
# Empty VITE_BACKEND_BASE_URL = same origin (Nginx forwards /api and /socket.io to the backend).
ARG VITE_BACKEND_BASE_URL=""
ARG VITE_FRONTEND_BASE_URL="http://localhost:5173"
ARG VITE_PROFILE_IMAGES_URL="/assets/images/profile/"
ARG VITE_CARD_IMAGES_URL="/assets/images/card/"
ENV VITE_BACKEND_BASE_URL=${VITE_BACKEND_BASE_URL} \
    VITE_FRONTEND_BASE_URL=${VITE_FRONTEND_BASE_URL} \
    VITE_PROFILE_IMAGES_URL=${VITE_PROFILE_IMAGES_URL} \
    VITE_CARD_IMAGES_URL=${VITE_CARD_IMAGES_URL}
RUN yarn build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
