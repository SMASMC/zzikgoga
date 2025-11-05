#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Backend BLUE/GREEN 배포 시작"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_DIR="${ROOT_DIR}/db"
PROJECT="main-ec2"

# 롤백 플래그
DEPLOYMENT_FAILED=0
NEED_ROLLBACK=0

# 롤백 함수
rollback_deployment() {
  # trap 제거하여 롤백 중 재귀 방지
  trap - ERR
  echo ""
  echo "🔄 배포 실패! 롤백을 시작합니다..."

  # 새로 배포한 컨테이너 중지 및 제거
  if [ -n "${NEW:-}" ] && docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-${NEW}"; then
    echo "  🛑 새 컨테이너 중지 중: zzikgoga-${NEW}"
    docker stop "zzikgoga-${NEW}" 2>/dev/null || true
    docker rm -f "zzikgoga-${NEW}" 2>/dev/null || true

    # docker-compose로 완전히 정리
    if [ -f "${ROOT_DIR}/docker-compose-backend-${NEW}.yml" ]; then
      ( cd "${ROOT_DIR}" && docker compose -p "${PROJECT}" -f "docker-compose-backend-${NEW}.yml" down 2>/dev/null || true )
    fi
  fi

  # 이전 환경이 있었다면 복구
  if [ -n "${CURRENT:-}" ] && [ -n "${OLD:-}" ]; then
    echo "  ♻️ 이전 환경 복구 중: zzikgoga-${OLD}"

    # 이전 컨테이너가 중지되어 있다면 다시 시작
    if docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-${OLD}"; then
      if ! docker ps --format '{{.Names}}' | grep -qx "zzikgoga-${OLD}"; then
        echo "  🔄 이전 컨테이너 재시작 중..."
        docker start "zzikgoga-${OLD}" 2>/dev/null || true
        sleep 5

        # 이전 컨테이너 헬스 체크
        for i in $(seq 1 30); do
          if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${OLD_PORT}/health-check" | grep -q "^[234]"; then
            echo "  ✅ 이전 환경이 정상적으로 복구되었습니다"
            break
          fi
          sleep 2
        done
      else
        echo "  ✅ 이전 환경이 이미 실행 중입니다"
      fi
    else
      # 이전 컨테이너가 없다면 다시 생성
      echo "  🔄 이전 환경 재생성 중..."
      ( cd "${ROOT_DIR}" && docker compose -p "${PROJECT}" -f "docker-compose-backend-${OLD}.yml" up -d )
      sleep 10
    fi

    # Nginx 설정도 이전 버전으로 복구
    if [ -f "${ROOT_DIR}/nginx/backend-${OLD}.conf" ]; then
      echo "  🔧 Nginx 설정 복구 중..."
      sudo cp "${ROOT_DIR}/nginx/backend-${OLD}.conf" /etc/nginx/sites-available/api.zzik.kr
      sudo ln -sf /etc/nginx/sites-available/api.zzik.kr /etc/nginx/sites-enabled/api.zzik.kr
      if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo "  ✅ Nginx 설정 복구 완료"
      fi
    fi
  else
    echo "  ⚠️ 이전 환경이 없었습니다. 새 환경만 제거합니다."
  fi

  echo "❌ 배포 실패: 이전 환경으로 롤백되었습니다"
  echo "⏰ 실패 시간: $(date '+%Y-%m-%d %H:%M:%S')"
  exit 1
}

# ERR 시그널 발생 시 자동 롤백
trap 'rollback_deployment' ERR

# 1) Env 파일 준비(Jenkins가 준비한 .env 필요)
if [ ! -f "${ROOT_DIR}/.env" ]; then
  echo "❌ ${ROOT_DIR}/.env 가 없습니다 (Jenkins에서 준비되어야 함)" >&2
  exit 1
fi
install -m 600 "${ROOT_DIR}/.env" "${DB_DIR}/.env"
# CRLF 정규화
sed -i 's/\r$//' "${ROOT_DIR}/.env" || true
sed -i 's/\r$//' "${DB_DIR}/.env" || true

# Redis 컨테이너명(.env의 REDIS_DB) 확인(기본값: redis)
REDIS_NAME=$(sed -n 's/^REDIS_DB=\s*//p' "${DB_DIR}/.env" 2>/dev/null | tr -d '\r' | tail -n1)
[ -n "${REDIS_NAME}" ] || REDIS_NAME=redis

# 2) Redis 존재 시 유지, 없을 때만 생성(up -d)
echo "🗄️ Redis 존재 여부 확인 후 필요 시만 기동"
if ! docker ps -a --format '{{.Names}}' | grep -qx "${REDIS_NAME}"; then
  ( cd "${DB_DIR}" && docker compose -p "${PROJECT}" -f docker-compose.redis.yml up -d )
fi

# PostgreSQL은 이미 my-postgres-db로 실행 중이라고 가정
echo "🔎 PostgreSQL 컨테이너 확인 (my-postgres-db)"
if ! docker ps --format '{{.Names}}' | grep -qx "my-postgres-db"; then
  echo "❌ PostgreSQL container 'my-postgres-db' is not running"
  exit 1
fi
echo "✅ PostgreSQL container 'my-postgres-db' is running"

# 대상 DB 존재 보장(없으면 생성)
echo "🛠️ 대상 데이터베이스 존재 보장(create-if-missing)"
bash "${ROOT_DIR}/scripts/ensure-db-exists.sh" "${ROOT_DIR}/.env"

echo "🔎 DB/Redis 준비 상태 확인"

# PostgreSQL 준비 확인 (healthcheck가 없으므로 pg_isready 사용)
echo "  📊 PostgreSQL 준비 대기 (my-postgres-db)"
DB_READY=0
for i in $(seq 1 30); do
  if docker exec my-postgres-db pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
    echo "  ✅ PostgreSQL is ready (attempt $i)"
    DB_READY=1
    break
  fi
  echo "  ⏳ PostgreSQL not ready yet (attempt $i)"
  sleep 2
done
[ $DB_READY -eq 1 ] || { echo "❌ PostgreSQL is not ready after 60 seconds"; docker logs my-postgres-db --tail=50 || true; exit 1; }

# Redis 헬스 확인
echo "  📊 Redis 헬스 대기 (${REDIS_NAME})"
for i in $(seq 1 20); do
  rd_h=$(docker inspect -f '{{.State.Health.Status}}' "${REDIS_NAME}" 2>/dev/null || echo 'unknown')
  if [ "${rd_h}" = "healthy" ]; then
    echo "  ✅ Redis is healthy (attempt $i)"
    break
  fi
  echo "  ⏳ Redis status: ${rd_h} (attempt $i)"
  sleep 3
done
[ "${rd_h}" = healthy ] || { echo "❌ redis not healthy (${REDIS_NAME})"; docker logs "${REDIS_NAME}" --tail=50 || true; exit 1; }

# 3) 현재 실행 중인 색 파악 후 새 색 결정
BLUE_UP=$(docker ps --format '{{.Names}}' | grep -c '^zzikgoga-blue$' || true)
GREEN_UP=$(docker ps --format '{{.Names}}' | grep -c '^zzikgoga-green$' || true)
CURRENT=""; [ "$BLUE_UP" -gt 0 ] && CURRENT=blue; [ "$GREEN_UP" -gt 0 ] && CURRENT=green
if [ "$CURRENT" = "blue" ]; then NEW=green; NEW_PORT=8082; OLD=blue; OLD_PORT=8081; else NEW=blue; NEW_PORT=8081; OLD=green; OLD_PORT=8082; fi
echo "📋 current=${CURRENT:-none} → new=$NEW ($NEW_PORT)"

# 4) 새 색 기동(compose up -d)
( cd "${ROOT_DIR}" && docker compose -p "${PROJECT}" -f "docker-compose-backend-${NEW}.yml" up -d )

# 5) 컨테이너 헬스 우선 확인 후, HTTP 준비 상태 체크(2xx/3xx/4xx 허용)
CONTAINER_NAME="zzikgoga-${NEW}"
echo "⏳ 컨테이너 헬스 대기: ${CONTAINER_NAME}"
for i in $(seq 1 120); do
  hs=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CONTAINER_NAME}" 2>/dev/null || echo 'unknown')
  echo "  health attempt $i: ${hs}"
  case "$hs" in healthy) break;; none) echo "  no healthcheck configured; proceeding"; hs=healthy; break;; start*|unknown) ;; unhealthy) echo "❌ container unhealthy"; docker logs "${CONTAINER_NAME}" --tail=200 || true; NEED_ROLLBACK=1; rollback_deployment;; esac
  sleep 3
done
if [ "$hs" != "healthy" ] && [ "$hs" != "none" ]; then
  echo "❌ container did not become healthy in time"
  docker logs "${CONTAINER_NAME}" --tail=200 || true
  NEED_ROLLBACK=1
  rollback_deployment
fi

echo "🌐 Backend HTTP 준비 확인 :${NEW_PORT}"
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${NEW_PORT}/health-check" || echo 000)
  if [ "$code" = 000 ] || [ "$code" = 404 ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${NEW_PORT}/" || echo 000)
  fi
  echo "  attempt $i: ${NEW_PORT} -> $code"
  case "$code" in 2*|3*|4*) break;; esac
  sleep 3
done
case "$code" in
  2*|3*|4*) : ;;
  *)
    echo "❌ backend HTTP check failed on :${NEW_PORT}"
    docker logs "${CONTAINER_NAME}" --tail=200 || true
    NEED_ROLLBACK=1
    rollback_deployment
    ;;
esac

# 6) Nginx 설정 적용(backend-<color>.conf → api.zzik.kr) 후 reload
echo "🧩 Nginx 설정 적용"
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
BACKEND_CONF_SRC="${ROOT_DIR}/nginx/backend-${NEW}.conf"
if [ -f "$BACKEND_CONF_SRC" ]; then
  echo "  - backend conf: $BACKEND_CONF_SRC → api.zzik.kr"
  sudo cp "$BACKEND_CONF_SRC" ${NGINX_SITES_AVAILABLE}/api.zzik.kr
  sudo ln -sf ${NGINX_SITES_AVAILABLE}/api.zzik.kr ${NGINX_SITES_ENABLED}/api.zzik.kr

  # Also deploy split vhosts to avoid server_name duplication
  if [ -f "${ROOT_DIR}/nginx/jenkins.conf" ]; then
    echo "  - jenkins conf: ${ROOT_DIR}/nginx/jenkins.conf -> jenkins.zzik.kr"
    sudo cp "${ROOT_DIR}/nginx/jenkins.conf" ${NGINX_SITES_AVAILABLE}/jenkins.zzik.kr
    sudo ln -sf ${NGINX_SITES_AVAILABLE}/jenkins.zzik.kr ${NGINX_SITES_ENABLED}/jenkins.zzik.kr
  fi
  if [ -f "${ROOT_DIR}/nginx/monitoring.conf" ]; then
    echo "  - monitoring conf: ${ROOT_DIR}/nginx/monitoring.conf -> monitoring.zzik.kr"
    sudo cp "${ROOT_DIR}/nginx/monitoring.conf" ${NGINX_SITES_AVAILABLE}/monitoring.zzik.kr
    sudo ln -sf ${NGINX_SITES_AVAILABLE}/monitoring.zzik.kr ${NGINX_SITES_ENABLED}/monitoring.zzik.kr
  fi
else
  echo "❌ backend conf 누락: $BACKEND_CONF_SRC" >&2
  exit 1
fi

if sudo -n nginx -t; then
  sudo -n systemctl reload nginx
  echo "✅ nginx reloaded"
else
  echo "❌ nginx config test failed" >&2
  NEED_ROLLBACK=1
  rollback_deployment
fi

# 최종 배포 성공 확인 후에만 이전 환경 정리
echo "✅ 배포 성공 확인 완료"

# trap 해제 - 이제 롤백이 필요 없음
trap - ERR

# 7) 이전 색(OLD) 백엔드만 안전 정리(DB/Redis/네트워크는 유지)
if [ -n "$CURRENT" ]; then
  echo "🛑 stopping old=$OLD"
  sleep 10  # 트래픽 전환을 위한 대기
  docker stop "zzikgoga-${OLD}" 2>/dev/null || true
  docker rm -f "zzikgoga-${OLD}" 2>/dev/null || true
fi

# 6.5) monitoring stack (Grafana/Prometheus)
MON_DIR="${ROOT_DIR}/monitoring"
MON_COMPOSE="${MON_DIR}/docker-compose.monitoring.yml"

if [ -f "$MON_COMPOSE" ]; then
  if [ -f "${MON_DIR}/.env.monitoring" ]; then
    echo "[monitoring] checking existing containers"
    HAVE_GRAFANA=$(docker ps -a --format '{{.Names}}' | grep -x 'grafana' || true)
    HAVE_PROM=$(docker ps -a --format '{{.Names}}' | grep -x 'prometheus' || true)

    # Grafana 강제 재생성 (환경 변수 업데이트 보장)
    if [ -n "$HAVE_GRAFANA" ]; then
      echo "[monitoring] recreating grafana to apply latest configuration"
      ( cd "$MON_DIR" && docker compose -p main-ec2-monitoring -f "$MON_COMPOSE" up -d --force-recreate grafana )
    else
      echo "[monitoring] creating grafana"
      ( cd "$MON_DIR" && docker compose -p main-ec2-monitoring -f "$MON_COMPOSE" up -d grafana )
    fi

    # Prometheus는 존재 여부만 확인하여 생성
    if [ -z "$HAVE_PROM" ]; then
      echo "[monitoring] creating prometheus"
      ( cd "$MON_DIR" && docker compose -p main-ec2-monitoring -f "$MON_COMPOSE" up -d prometheus )
    else
      echo "[monitoring] prometheus exists; ensuring running state"
      docker start prometheus 2>/dev/null || true
    fi
  else
    echo "[monitoring] ${MON_DIR}/.env.monitoring missing; skip starting stack"
  fi
fi

echo "🎉 배포 완료: ${CURRENT:-none} → ${NEW} (:${NEW_PORT})"
