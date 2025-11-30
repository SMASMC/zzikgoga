#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Backend BLUE/GREEN 배포 시작"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 0) Docker 네트워크 사전 생성 (external: true 이므로 먼저 존재해야 함)
NETWORK_NAME="zzik-network"
echo "🔗 Docker 네트워크 확인: ${NETWORK_NAME}"
if ! docker network inspect "${NETWORK_NAME}" >/dev/null 2>&1; then
  echo "  ⚙️ 네트워크가 없습니다. 생성 중..."
  docker network create "${NETWORK_NAME}"
  echo "  ✅ 네트워크 생성 완료: ${NETWORK_NAME}"
else
  echo "  ✅ 네트워크가 이미 존재합니다: ${NETWORK_NAME}"
fi

# 0-1) 기존 DB/Redis 컨테이너가 zzik-network에 연결되어 있는지 확인하고 연결
echo "🔗 기존 컨테이너 네트워크 연결 확인"
for container in zzik-db zzik_redis redis; do
  if docker ps --format '{{.Names}}' | grep -qx "${container}"; then
    if ! docker inspect "${container}" --format '{{json .NetworkSettings.Networks}}' | grep -q "${NETWORK_NAME}"; then
      echo "  ⚙️ ${container}를 ${NETWORK_NAME}에 연결 중..."
      docker network connect "${NETWORK_NAME}" "${container}" 2>/dev/null || true
      echo "  ✅ ${container} 연결 완료"
    else
      echo "  ✅ ${container}는 이미 ${NETWORK_NAME}에 연결되어 있습니다"
    fi
  fi
done

# 0-2) Redis 컨테이너에 'redis' 별칭 추가 (zzik_redis -> redis alias)
REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i redis | head -1)
if [ -n "${REDIS_CONTAINER}" ] && [ "${REDIS_CONTAINER}" != "redis" ]; then
  echo "🔗 Redis 별칭(alias) 설정: ${REDIS_CONTAINER} -> redis"
  # 기존 연결 해제 후 별칭과 함께 재연결
  docker network disconnect "${NETWORK_NAME}" "${REDIS_CONTAINER}" 2>/dev/null || true
  docker network connect --alias redis "${NETWORK_NAME}" "${REDIS_CONTAINER}" 2>/dev/null || true
  echo "  ✅ Redis alias 설정 완료"
fi

DB_DIR="${ROOT_DIR}/db"
PROJECT="main-ec2"
IMAGE_NAME="${IMAGE_NAME:-zzikgoga}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CURRENT_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
PREVIOUS_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}-previous"

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
    echo "  🔥 신규 컨테이너 중지: zzikgoga-${NEW}"
    docker stop "zzikgoga-${NEW}" 2>/dev/null || true
    docker rm -f "zzikgoga-${NEW}" 2>/dev/null || true

    # docker-compose로 신규 리소스 정리
    if [ -f "${ROOT_DIR}/docker-compose-backend-${NEW}.yml" ]; then
      ( cd "${ROOT_DIR}" && docker compose -p "${PROJECT}" -f "docker-compose-backend-${NEW}.yml" down 2>/dev/null || true )
    fi
  fi

  if docker image inspect "${PREVIOUS_IMAGE}" >/dev/null 2>&1; then
    echo "  🔁 Docker 이미지 태그 복구: ${CURRENT_IMAGE} ← ${PREVIOUS_IMAGE}"
    docker tag "${PREVIOUS_IMAGE}" "${CURRENT_IMAGE}" || true
  fi

  # 이전 환경이 있었다면 복구
  if [ -n "${CURRENT:-}" ] && [ -n "${OLD:-}" ]; then
    echo "  ♻️ 이전 환경 복구 중: zzikgoga-${OLD}"

    # 이전 컨테이너가 중지되어 있다면 다시 시작
    if docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-${OLD}"; then
      if ! docker ps --format '{{.Names}}' | grep -qx "zzikgoga-${OLD}"; then
        echo "  🔄 이전 컨테이너 재시작 중... (이미지: ${OLD_IMAGE_ID:-unknown})"
        docker start "zzikgoga-${OLD}" 2>/dev/null || true
        sleep 5

        # 이전 컨테이너 헬스 체크
        echo "  ⏳ 이전 컨테이너 헬스 체크 대기..."
        for i in $(seq 1 30); do
          if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${OLD_PORT}/health-check" | grep -q "^[234]"; then
            echo "  ✅ 이전 환경이 정상적으로 복구되었습니다 (시도 $i/30)"
            break
          fi
          if [ $i -eq 30 ]; then
            echo "  ⚠️ 헬스 체크 타임아웃이지만 컨테이너는 실행 중입니다"
          fi
          sleep 2
        done
      else
        echo "  ✅ 이전 환경이 이미 실행 중입니다"
      fi
    else
      # 이전 컨테이너가 없다면 경고 (이상 상황)
      echo "  ⚠️ 경고: 이전 컨테이너가 완전히 삭제되었습니다"
      echo "  🔄 이전 환경 재생성 시도 (최선의 노력)..."
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

# PostgreSQL 사용자/DB명 (.env에서 읽기)
POSTGRES_USER=$(sed -n 's/^POSTGRES_USER=\s*//p' "${DB_DIR}/.env" 2>/dev/null | tr -d '\r' | tail -n1)
POSTGRES_DB=$(sed -n 's/^POSTGRES_DB=\s*//p' "${DB_DIR}/.env" 2>/dev/null | tr -d '\r' | tail -n1)
[ -n "${POSTGRES_USER}" ] || POSTGRES_USER=postgres
[ -n "${POSTGRES_DB}" ] || POSTGRES_DB=postgres

# Datasource URL 파싱 (외부 DB 여부 판단용)
SPRING_DATASOURCE_URL=$(sed -n 's/^SPRING_DATASOURCE_URL=\s*//p' "${DB_DIR}/.env" 2>/dev/null | tr -d '\r' | tail -n1)
DATASOURCE_HOST=""
if [ -n "${SPRING_DATASOURCE_URL}" ]; then
  DATASOURCE_HOST=$(echo "${SPRING_DATASOURCE_URL}" | sed -E 's#^[a-zA-Z0-9_+.-]+://([^@]+@)?([^:/?]+).*#\2#')
fi

# PostgreSQL 컨테이너명(.env의 POSTGRES_CONTAINER_NAME) 또는 datasource host 추론
POSTGRES_CONTAINER=$(sed -n 's/^POSTGRES_CONTAINER_NAME=\s*//p' "${DB_DIR}/.env" 2>/dev/null | tr -d '\r' | tail -n1)
if [ -z "${POSTGRES_CONTAINER}" ] && [ -n "${DATASOURCE_HOST}" ]; then
  case "${DATASOURCE_HOST}" in
    localhost|127.0.0.1) POSTGRES_CONTAINER="my-postgres-db" ;;
    *.internal|*.local|*.lan) POSTGRES_CONTAINER="my-postgres-db" ;;
    *.*) : ;; # 외부 호스트로 간주
    *) POSTGRES_CONTAINER="${DATASOURCE_HOST}" ;;
  esac
fi
if [ -z "${POSTGRES_CONTAINER}" ] && docker ps --format '{{.Names}}' | grep -qx "my-postgres-db" 2>/dev/null; then
  POSTGRES_CONTAINER="my-postgres-db"
elif [ -z "${POSTGRES_CONTAINER}" ] && docker ps --format '{{.Names}}' | grep -qx "zzik-db" 2>/dev/null; then
  POSTGRES_CONTAINER="zzik-db"
fi
[ -n "${POSTGRES_CONTAINER}" ] || POSTGRES_CONTAINER="zzik-db"

# 2) Redis 존재 시 유지, 없을 때만 생성(up -d)
echo "🗄️ Redis 존재 여부 확인 후 필요 시만 기동"
if ! docker ps -a --format '{{.Names}}' | grep -qx "${REDIS_NAME}"; then
  ( cd "${DB_DIR}" && docker compose -p "${PROJECT}" -f docker-compose.redis.yml up -d )
fi

if [ -n "${POSTGRES_CONTAINER}" ]; then
  echo "🔎 PostgreSQL 컨테이너 확인 (${POSTGRES_CONTAINER})"
  if ! docker ps -a --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
    echo "⚙️ PostgreSQL 컨테이너가 없어 docker-compose로 기동합니다"
    ( cd "${DB_DIR}" && docker compose -p "${PROJECT}" -f docker-compose.psql.yml up -d )
  fi

  if ! docker ps --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
    if docker ps -a --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
      echo "⚙️ PostgreSQL 컨테이너가 중지 상태라 재시작합니다"
      docker start "${POSTGRES_CONTAINER}" >/dev/null || true
      sleep 2
    fi
  fi

  if ! docker ps --format '{{.Names}}' | grep -qx "${POSTGRES_CONTAINER}"; then
    echo "❌ PostgreSQL container '${POSTGRES_CONTAINER}' is not running"
    exit 1
  fi
  echo "✅ PostgreSQL container '${POSTGRES_CONTAINER}' is running"

  echo "🛠️ 대상 데이터베이스 존재 보장(create-if-missing)"
  POSTGRES_CONTAINER_NAME="${POSTGRES_CONTAINER}" bash "${ROOT_DIR}/scripts/ensure-db-exists.sh" "${ROOT_DIR}/.env"

  echo "🔎 DB/Redis 준비 상태 확인"

  echo "  📊 PostgreSQL 준비 대기 (${POSTGRES_CONTAINER})"
  DB_READY=0
  for i in $(seq 1 30); do
    if docker exec "${POSTGRES_CONTAINER}" pg_isready -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; then
      echo "  ✅ PostgreSQL is ready (attempt $i)"
      DB_READY=1
      break
    fi
    echo "  ⏳ PostgreSQL not ready yet (attempt $i)"
    sleep 2
  done
  [ $DB_READY -eq 1 ] || { echo "❌ PostgreSQL is not ready after 60 seconds"; docker logs "${POSTGRES_CONTAINER}" --tail=50 || true; exit 1; }
else
  echo "🔎 PostgreSQL 컨테이너 확인 SKIP (외부 DB 사용: ${DATASOURCE_HOST:-unknown})"
  echo "🛠️ 대상 데이터베이스 존재 보장 SKIP (외부 DB 가정)"
  echo "🔎 DB/Redis 준비 상태 확인 - Redis만 검사"
fi

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

# 4-1) 이전 컨테이너가 있다면 중지 (삭제는 하지 않음 - 롤백을 위해)
if [ -n "$CURRENT" ]; then
  echo "⏸️ 이전 컨테이너 중지 (롤백 대비): zzikgoga-${OLD}"
  docker stop "zzikgoga-${OLD}" 2>/dev/null || true

  # 중지된 컨테이너의 이미지 ID 백업
  OLD_IMAGE_ID=$(docker inspect -f '{{.Image}}' "zzikgoga-${OLD}" 2>/dev/null || echo "")
  if [ -n "$OLD_IMAGE_ID" ]; then
    echo "💾 이전 컨테이너 이미지 ID 백업: ${OLD_IMAGE_ID}"
  fi
fi

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
  # /api context path 포함하여 헬스체크
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${NEW_PORT}/api/health-check" || echo 000)
  if [ "$code" = 000 ] || [ "$code" = 404 ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${NEW_PORT}/api/" || echo 000)
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
ACTIVE_PORT=$(docker inspect -f '{{range $p,$conf := .NetworkSettings.Ports}}{{if eq $p "8080/tcp"}}{{(index $conf 0).HostPort}}{{end}}{{end}}' "${CONTAINER_NAME}" 2>/dev/null || echo "")
case "$ACTIVE_PORT" in
  8081) BACKEND_CONF_SRC="${ROOT_DIR}/nginx/backend-blue.conf" ;;
  8082) BACKEND_CONF_SRC="${ROOT_DIR}/nginx/backend-green.conf" ;;
  *) BACKEND_CONF_SRC="${ROOT_DIR}/nginx/backend-${NEW}.conf" ;;
esac

if [ -f "$BACKEND_CONF_SRC" ]; then
  echo "  - backend conf: $BACKEND_CONF_SRC → api.zzik.kr (port ${ACTIVE_PORT:-${NEW_PORT}})"
  sudo cp "$BACKEND_CONF_SRC" ${NGINX_SITES_AVAILABLE}/api.zzik.kr
  sudo ln -sf ${NGINX_SITES_AVAILABLE}/api.zzik.kr ${NGINX_SITES_ENABLED}/api.zzik.kr
else
  echo "❌ backend conf 누락: $BACKEND_CONF_SRC" >&2
  exit 1
fi

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
