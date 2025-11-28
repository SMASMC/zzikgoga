#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Jenkins 배포 시작"
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
# 2) Jenkins 컨테이너 배포
# ─────────────────────────────────────────────────────────────────────────────
JENKINS_CONTAINER="zzik-jenkins"
COMPOSE_FILE="${ROOT_DIR}/docker-compose-jenkins.yml"

echo "📦 Jenkins 컨테이너 배포"

if docker ps --format '{{.Names}}' | grep -qx "${JENKINS_CONTAINER}"; then
  echo "  ⚠️ 기존 Jenkins 컨테이너가 실행 중입니다. 재시작합니다..."
  docker compose -f "${COMPOSE_FILE}" down
fi

echo "  ⚙️ Jenkins 컨테이너 시작 중..."
docker compose -f "${COMPOSE_FILE}" up -d

# ─────────────────────────────────────────────────────────────────────────────
# 3) 헬스체크
# ─────────────────────────────────────────────────────────────────────────────
echo "🏥 Jenkins 헬스체크 대기 중... (최대 120초)"
MAX_WAIT=120
WAITED=0
INTERVAL=5

while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/login 2>/dev/null | grep -q "200\|403"; then
    echo "  ✅ Jenkins가 정상적으로 시작되었습니다!"
    break
  fi
  echo "  ⏳ 대기 중... (${WAITED}/${MAX_WAIT}초)"
  sleep $INTERVAL
  WAITED=$((WAITED + INTERVAL))
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "  ⚠️ Jenkins 시작 대기 시간 초과. 로그를 확인하세요."
  echo "  📋 docker logs ${JENKINS_CONTAINER}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# 4) Nginx 설정 배포
# ─────────────────────────────────────────────────────────────────────────────
NGINX_CONF="${ROOT_DIR}/nginx/jenkins.conf"
NGINX_AVAILABLE="/etc/nginx/sites-available/jenkins.zzik.kr.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/jenkins.zzik.kr.conf"

echo "🌐 Nginx 설정 배포"

if [ -f "${NGINX_CONF}" ]; then
  sudo cp "${NGINX_CONF}" "${NGINX_AVAILABLE}"
  sudo ln -sf "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"

  if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "  ✅ Nginx 설정 적용 완료"
  else
    echo "  ❌ Nginx 설정 오류. 설정을 확인하세요."
    exit 1
  fi
else
  echo "  ⚠️ Nginx 설정 파일을 찾을 수 없습니다: ${NGINX_CONF}"
  echo "  📝 수동으로 설정하세요."
fi

# ─────────────────────────────────────────────────────────────────────────────
# 5) 초기 비밀번호 출력
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Jenkins 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Jenkins 접속 URL: https://jenkins.zzik.kr (Cloudflare 터널 설정 후)"
echo "📌 로컬 접속: http://localhost:8080"
echo ""

# 초기 비밀번호 출력 시도
sleep 3
if docker exec "${JENKINS_CONTAINER}" test -f /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null; then
  echo "🔑 초기 관리자 비밀번호:"
  docker exec "${JENKINS_CONTAINER}" cat /var/jenkins_home/secrets/initialAdminPassword
  echo ""
else
  echo "⏳ 초기 비밀번호가 아직 생성되지 않았습니다."
  echo "   잠시 후 다음 명령어로 확인하세요:"
  echo "   docker exec ${JENKINS_CONTAINER} cat /var/jenkins_home/secrets/initialAdminPassword"
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏰ 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"
