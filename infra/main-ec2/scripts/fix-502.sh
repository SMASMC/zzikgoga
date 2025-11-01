#!/usr/bin/env bash
set -euo pipefail

# fix-502.sh: self-healing deploy helper for API 502 on api.zzik.kr
# - Ensures .env, DB/Redis up
# - Ensures backend image exists (pull/load/build if needed)
# - Runs blue/green deploy script (deploy-backend.sh)
# - Verifies Nginx -> backend port alignment and reports status

usage() {
  cat << EOF
Usage: $0 [--env-file PATH] [--registry-image IMAGE[:TAG]] [--image-tar TAR] [--build-local]

Options:
  --env-file PATH         Path to .env to use (copied into infra/main-ec2/.env)
  --registry-image IMAGE  docker pull this image if local zzikgoga:latest is missing
  --image-tar TAR         docker load this TAR if image missing
  --build-local           build zzikgoga:latest with be.dockerfile using build/libs/*.jar

Notes:
  - Priority: if image exists locally, pull/load/build are skipped.
  - Provide at least one of --registry-image | --image-tar | --build-local
    when the local image is absent.
EOF
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="main-ec2"
DOTENV="${ROOT_DIR}/.env"
REGISTRY_IMAGE=""
IMAGE_TAR=""
DO_BUILD_LOCAL=0

while [ $# -gt 0 ]; do
  case "$1" in
    --env-file) DOTENV="$2"; shift 2;;
    --registry-image) REGISTRY_IMAGE="$2"; shift 2;;
    --image-tar) IMAGE_TAR="$2"; shift 2;;
    --build-local) DO_BUILD_LOCAL=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "[fix-502] unknown arg: $1" >&2; usage; exit 1;;
  esac
done

die() { echo "[fix-502] ERROR: $*" >&2; exit 1; }

copy_env() {
  if [ -f "$DOTENV" ] && [ "$DOTENV" != "${ROOT_DIR}/.env" ]; then
    install -m 600 "$DOTENV" "${ROOT_DIR}/.env"
    echo "[fix-502] copied .env -> ${ROOT_DIR}/.env"
  fi
  [ -f "${ROOT_DIR}/.env" ] || die ".env missing. Provide with --env-file PATH"
}

ensure_db_redis() {
  echo "[fix-502] ensuring db/redis up"
  ( cd "${ROOT_DIR}/db" && docker compose -p "$PROJECT" -f docker-compose.redis.yml up -d )
  ( cd "${ROOT_DIR}/db" && docker compose -p "$PROJECT" -f docker-compose.psql.yml up -d )
}

image_exists() { docker images --format '{{.Repository}}:{{.Tag}}' | grep -qx 'zzikgoga:latest'; }

ensure_image() {
  if image_exists; then echo "[fix-502] image zzikgoga:latest already present"; return 0; fi
  echo "[fix-502] image missing; trying to obtain one"
  if [ -n "$REGISTRY_IMAGE" ]; then
    echo "  - pulling $REGISTRY_IMAGE"
    docker pull "$REGISTRY_IMAGE"
    docker tag "$REGISTRY_IMAGE" zzikgoga:latest
    return 0
  fi
  if [ -n "$IMAGE_TAR" ]; then
    [ -f "$IMAGE_TAR" ] || die "image tar not found: $IMAGE_TAR"
    echo "  - loading from $IMAGE_TAR"
    docker load -i "$IMAGE_TAR"
    image_exists || die "loaded tar did not provide zzikgoga:latest"
    return 0
  fi
  if [ $DO_BUILD_LOCAL -eq 1 ]; then
    echo "  - building locally via be.dockerfile"
    DOCKERFILE="${ROOT_DIR}/dockerfiles/be.dockerfile"
    [ -f "$DOCKERFILE" ] || die "dockerfile missing: $DOCKERFILE"
    JAR_COUNT=$(find "$ROOT_DIR/.." -maxdepth 3 -type f -path '*/build/libs/*.jar' | wc -l | tr -d ' ')
    [ "$JAR_COUNT" -gt 0 ] || die "no JAR found under */build/libs; copy one or use --registry-image/--image-tar"
    ( cd "${ROOT_DIR}/.." && docker build -f "$DOCKERFILE" -t zzikgoga:latest . )
    return 0
  fi
  die "no way to obtain image. Use --registry-image or --image-tar or --build-local"
}

run_deploy() {
  echo "[fix-502] running blue/green deploy"
  chmod +x "${ROOT_DIR}/scripts/deploy-backend.sh"
  "${ROOT_DIR}/scripts/deploy-backend.sh"
}

sync_nginx_and_report() {
  echo "[fix-502] nginx active upstream line"
  if [ -f /etc/nginx/sites-enabled/api.zzik.kr ]; then
    grep -nE "^\s*server\s+localhost:" /etc/nginx/sites-enabled/api.zzik.kr || true
  else
    echo "  api.zzik.kr vhost not found" >&2
  fi
  echo "[fix-502] docker ps (zzikgoga*)"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | (grep zzikgoga || true)
  echo "[fix-502] health checks"
  for p in 8081 8082; do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/health-check || echo 000)
    [ "$code" = 000 ] && code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$p/ || echo 000)
    echo "  :$p -> $code"
  done
}

main() {
  copy_env
  ensure_db_redis
  ensure_image
  run_deploy
  sync_nginx_and_report
  echo "[fix-502] done"
}

main "$@"

