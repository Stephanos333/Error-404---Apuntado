#!/usr/bin/env bash
# Database initialization for the Apuntado system (docker-compose mongo-init service).
#  1. Migrates old data to the English data contracts (one-off, idempotent).
#  2. Creates the collections with their strict $jsonSchema validators and the indexes of the
#     document model (docs/schemas/create-collections.mongodb.js, ADR-04).
#  3. Loads the card design catalog: users cannot register without the default design.
# It is idempotent: it can run on every start.
set -euo pipefail

URI="${MONGODB_URI:-mongodb://mongodb:27017/apuntado?replicaSet=rs0}"

echo "[mongo-init] Migrating to the English data contracts..."
mongosh "$URI" --quiet --file /docker/mongo/migrate-english-contracts.js

echo "[mongo-init] Applying validators and indexes (docs/schemas)..."
cd /
mongosh "$URI" --quiet --file /docs/schemas/create-collections.mongodb.js

echo "[mongo-init] Loading the card design catalog..."
mongosh "$URI" --quiet --file /docker/mongo/seed-card-designs.js

echo "[mongo-init] Database ready."
