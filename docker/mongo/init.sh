#!/usr/bin/env bash
# Inicialización de la base de datos del Sistema Apuntado (servicio mongo-init de docker-compose).
#  1. Crea las colecciones con sus validadores $jsonSchema estrictos y los índices del modelo
#     documental (docs/schemas/crear-colecciones.mongodb.js, ADR-04).
#  2. Carga el catálogo de diseños de carta: sin el diseño por defecto no se pueden registrar usuarios.
# Es idempotente: se puede ejecutar en cada arranque.
set -euo pipefail

URI="${MONGODB_URI:-mongodb://mongodb:27017/apuntado?replicaSet=rs0}"

echo "[mongo-init] Aplicando validadores e índices (docs/schemas)..."
cd /
mongosh "$URI" --quiet --file /docs/schemas/crear-colecciones.mongodb.js

echo "[mongo-init] Cargando el catálogo de diseños de carta..."
mongosh "$URI" --quiet --file /docker/mongo/seed-disenos-carta.js

echo "[mongo-init] Base de datos lista."
