#!/usr/bin/env bash
# Starts the whole Apuntado system (MongoDB replica set + backend + frontend) with a single command.
# Usage: ./start.sh          (same as: docker compose up --build)
#        ./start.sh -d       (in the background; any argument is passed to docker compose up)
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker is not installed. Install Docker Desktop or Docker Engine: https://docs.docker.com/get-docker/" >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Error: Docker Compose v2 is required ('docker compose' command)." >&2
  exit 1
fi

secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i.bak \
    -e "s/^JWT_SECRET=.*/JWT_SECRET=$(secret)/" \
    -e "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$(secret)/" .env
  rm -f .env.bak
  echo "Created .env from .env.example with random JWT secrets."
fi

echo "Frontend:  http://localhost:${FRONTEND_PORT:-5173}"
echo "Backend:   http://localhost:${BACKEND_PORT:-3000}/api   (Swagger: http://localhost:${BACKEND_PORT:-3000}/docs)"
exec docker compose up --build "$@"
