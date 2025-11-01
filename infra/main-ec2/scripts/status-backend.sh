#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[status] nginx upstream in sites-enabled/api.zzik.kr"
if [ -f /etc/nginx/sites-enabled/api.zzik.kr ]; then
  grep -nE "^\s*server\s+localhost:" /etc/nginx/sites-enabled/api.zzik.kr || true
else
  echo "[status] /etc/nginx/sites-enabled/api.zzik.kr not found" >&2
fi

echo "[status] running backend containers"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | (grep zzikgoga || true)

echo "[status] image availability"
docker images zzikgoga:latest || true

echo "[status] health checks (8081,8082)"
for p in 8081 8082; do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/health-check || echo 000)
  [ "$code" = 000 ] && code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/ || echo 000)
  echo "  :$p -> $code"
done

echo "[status] nginx config test"
if sudo -n nginx -t 2>/dev/null; then
  echo "  nginx config OK"
else
  sudo nginx -t || true
fi

