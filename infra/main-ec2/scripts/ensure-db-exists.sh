#!/usr/bin/env bash
set -euo pipefail

# Ensure target Postgres database exists inside the running container `db`.
# Reads POSTGRES_DB and POSTGRES_USER from the provided .env file (first arg),
# falls back to sensible defaults.

ENV_FILE=${1:-"$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"}

if [ ! -f "$ENV_FILE" ]; then
  echo "[ensure-db] .env not found: $ENV_FILE" >&2
  exit 1
fi

# Strip CRLF and extract simple KEY=VALUE (no export, no spaces) safely
_val() {
  sed -n "s/^$1=\s*//p" "$ENV_FILE" 2>/dev/null \
    | tr -d '\r' \
    | sed 's/[[:space:]]*$//' \
    | tail -n1
}

POSTGRES_DB=$(_val POSTGRES_DB)
POSTGRES_USER=$(_val POSTGRES_USER)
POSTGRES_PASSWORD=$(_val POSTGRES_PASSWORD)

[ -n "${POSTGRES_DB}" ] || POSTGRES_DB=postgres
[ -n "${POSTGRES_USER}" ] || POSTGRES_USER=postgres
[ -n "${POSTGRES_PASSWORD:-}" ] || POSTGRES_PASSWORD=""

echo "[ensure-db] target db='${POSTGRES_DB}', user='${POSTGRES_USER}'"

# If target is the default 'postgres', it already exists; skip to be fast/idempotent
if [ "${POSTGRES_DB}" = "postgres" ]; then
  echo "[ensure-db] 'postgres' exists by default; nothing to do"
  exit 0
fi

# Wait briefly for container 'db' to be reachable (compose healthcheck already used by caller)
for i in $(seq 1 20); do
  if docker exec db env PGPASSWORD="${POSTGRES_PASSWORD}" pg_isready -U "${POSTGRES_USER}" -d postgres >/dev/null 2>&1; then break; fi
  sleep 2
done

set +e
docker exec db bash -lc "env PGPASSWORD='${POSTGRES_PASSWORD}' psql -U '${POSTGRES_USER}' -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='${POSTGRES_DB}'\"" | grep -q 1
exists=$?
set -e

if [ $exists -eq 0 ]; then
  echo "[ensure-db] database '${POSTGRES_DB}' already exists"
else
  echo "[ensure-db] creating database '${POSTGRES_DB}'"
  docker exec db bash -lc "env PGPASSWORD='${POSTGRES_PASSWORD}' psql -U '${POSTGRES_USER}' -d postgres -v ON_ERROR_STOP=1 -c \"CREATE DATABASE \"\"${POSTGRES_DB}\"\"\""
  echo "[ensure-db] created"
fi
