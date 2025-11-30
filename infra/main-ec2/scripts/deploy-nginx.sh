#!/usr/bin/env bash
set -euo pipefail

echo "🚀 zzik-nginx 배포 시작"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# 1) Docker 네트워크 생성
# ─────────────────────────────────────────────────────────────────────────────
NETWORK_NAME="zzik-network"
echo "🔗 Docker 네트워크 확인: ${NETWORK_NAME}"
if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  echo "  ⚙️ 네트워크가 없습니다. 생성 중..."
  docker network create "${NETWORK_NAME}"
  echo "  ✅ 네트워크 생성 완료: ${NETWORK_NAME}"
else
  echo "  ✅ 네트워크가 이미 존재합니다: ${NETWORK_NAME}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 2) zzik-nginx 컨테이너 배포
# ─────────────────────────────────────────────────────────────────────────────
NGINX_CONTAINER="zzik-nginx"
COMPOSE_FILE="${ROOT_DIR}/docker-compose-nginx.yml"

echo "📦 zzik-nginx 컨테이너 배포"

if docker ps --format '{{.Names}}' | grep -qx "${NGINX_CONTAINER}"; then
  echo "  ⚠️ 기존 zzik-nginx 컨테이너가 실행 중입니다. 재시작합니다..."
  docker compose -f "${COMPOSE_FILE}" down
fi

echo "  ⚙️ zzik-nginx 컨테이너 시작 중..."
docker compose -f "${COMPOSE_FILE}" up -d

# 컨테이너 시작 대기
echo "  ⏳ 컨테이너 시작 대기 중..."
sleep 5

# ─────────────────────────────────────────────────────────────────────────────
# 3) 현재 활성 환경 감지 (blue/green)
# ─────────────────────────────────────────────────────────────────────────────
echo "🔍 현재 활성 환경 감지 중..."

# Backend 환경 감지
if docker ps --format '{{.Names}}' | grep -qx "zzikgoga-green"; then
  BACKEND_ENV="green"
elif docker ps --format '{{.Names}}' | grep -qx "zzikgoga-blue"; then
  BACKEND_ENV="blue"
else
  BACKEND_ENV="blue"  # 기본값
  echo "  ⚠️ 활성 백엔드 컨테이너 없음. 기본값 blue 사용"
fi
echo "  📦 Backend 환경: ${BACKEND_ENV}"

# CRDT 환경 감지
if docker ps --format '{{.Names}}' | grep -qx "zzikgoga-node-green"; then
  CRDT_ENV="green"
elif docker ps --format '{{.Names}}' | grep -qx "zzikgoga-node-blue"; then
  CRDT_ENV="blue"
else
  CRDT_ENV="blue"  # 기본값
fi
echo "  📦 CRDT 환경: ${CRDT_ENV}"

# NFT 환경 감지
if docker ps --format '{{.Names}}' | grep -qx "zzikgoga-nft-green"; then
  NFT_ENV="green"
elif docker ps --format '{{.Names}}' | grep -qx "zzikgoga-nft-blue"; then
  NFT_ENV="blue"
else
  NFT_ENV="blue"  # 기본값
fi
echo "  📦 NFT 환경: ${NFT_ENV}"

# ─────────────────────────────────────────────────────────────────────────────
# 4) nginx 설정 파일 배포
# ─────────────────────────────────────────────────────────────────────────────
echo "📁 Nginx 설정 파일 배포"

NGINX_CONF_DIR="/etc/nginx/conf.d"

# 활성 환경에 맞는 설정 파일 배포
declare -A CONF_FILES=(
  ["${ROOT_DIR}/nginx/backend-${BACKEND_ENV}.conf"]="api.zzik.kr.conf"
  ["${ROOT_DIR}/nginx/frontend.conf"]="zzik.kr.conf"
  ["${ROOT_DIR}/nginx/jenkins.conf"]="jenkins.zzik.kr.conf"
  ["${ROOT_DIR}/nginx/crdt-${CRDT_ENV}.conf"]="crdt.zzik.kr.conf"
  ["${ROOT_DIR}/nginx/nft-${NFT_ENV}.conf"]="nft.zzik.kr.conf"
  ["${ROOT_DIR}/nginx/monitoring.conf"]="monitoring.zzik.kr.conf"
)

for src_file in "${!CONF_FILES[@]}"; do
  dst_file="${CONF_FILES[$src_file]}"
  if [ -f "$src_file" ]; then
    echo "  - ${src_file##*/} -> ${dst_file}"
    docker cp "$src_file" ${NGINX_CONTAINER}:${NGINX_CONF_DIR}/${dst_file}
  else
    echo "  ⚠️ 파일 없음: $src_file"
  fi
done

# 기본 default.conf 제거 (충돌 방지)
docker exec ${NGINX_CONTAINER} rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true

# ─────────────────────────────────────────────────────────────────────────────
# 5) 헬스체크
# ─────────────────────────────────────────────────────────────────────────────
echo "🏥 Nginx 설정 테스트 및 재로드"

if docker exec ${NGINX_CONTAINER} nginx -t 2>/dev/null; then
  docker exec ${NGINX_CONTAINER} nginx -s reload
  echo "  ✅ Nginx 설정 적용 완료"
else
  echo "  ❌ Nginx 설정 오류. 설정을 확인하세요."
  docker exec ${NGINX_CONTAINER} nginx -t || true
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# 6) cloudflared 네트워크 연결 확인
# ─────────────────────────────────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -qx "cloudflared"; then
  if ! docker inspect "cloudflared" --format '{{json .NetworkSettings.Networks}}' | grep -q "${NETWORK_NAME}"; then
    echo "  ⚙️ cloudflared를 ${NETWORK_NAME}에 연결 중..."
    docker network connect "${NETWORK_NAME}" "cloudflared" 2>/dev/null || true
    echo "  ✅ cloudflared 연결 완료"
  else
    echo "  ✅ cloudflared가 이미 ${NETWORK_NAME}에 연결되어 있습니다"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# 7) 완료 메시지
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ zzik-nginx 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Cloudflare Tunnel 설정에서 다음 URL로 라우팅하세요:"
echo "   - zzik.kr        -> http://zzik-nginx:80"
echo "   - api.zzik.kr    -> http://zzik-nginx:80"
echo "   - jenkins.zzik.kr -> http://zzik-nginx:80"
echo "   - crdt.zzik.kr   -> http://zzik-nginx:80"
echo "   - nft.zzik.kr    -> http://zzik-nginx:80"
echo ""
echo "⏰ 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"
