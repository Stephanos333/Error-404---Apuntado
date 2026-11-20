#!/usr/bin/env bash
# Levanta el Sistema Apuntado completo (MongoDB replica set + backend + frontend) con un solo comando.
# Uso: ./start.sh            (equivale a: docker compose up --build)
#      ./start.sh -d         (en segundo plano; cualquier argumento se pasa a docker compose up)
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker no está instalado. Instale Docker Desktop o Docker Engine: https://docs.docker.com/get-docker/" >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Error: se requiere Docker Compose v2 (comando 'docker compose')." >&2
  exit 1
fi

secreto() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i.bak \
    -e "s/^JWT_SECRET=.*/JWT_SECRET=$(secreto)/" \
    -e "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$(secreto)/" .env
  rm -f .env.bak
  echo "Se creó .env a partir de .env.example con secretos JWT aleatorios."
fi

echo "Frontend:  http://localhost:${FRONTEND_PORT:-5173}"
echo "Backend:   http://localhost:${BACKEND_PORT:-3000}/api   (Swagger: http://localhost:${BACKEND_PORT:-3000}/docs)"
exec docker compose up --build "$@"
