# syntax=docker/dockerfile:1
# Frontend React (Vite) del Sistema Apuntado. Build multi-stage:
#  1. build:   instala con el yarn.lock (reproducible) y genera los estáticos con `tsc && vite build`.
#  2. runtime: Nginx sirve la SPA y hace de proxy inverso hacia el backend (/api, /socket.io, /docs),
#              así navegador y API comparten origen y no hay que fijar la URL del backend en la imagen.

ARG NODE_VERSION=20.18-alpine

FROM node:${NODE_VERSION} AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --network-timeout 600000
COPY . .
# Variables de Vite: se incrustan en el bundle al compilar.
# VITE_BACKEND_BASE_URL vacío = mismo origen (Nginx reenvía /api y /socket.io al backend).
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
