#!/bin/bash

set -e

echo "🚀 CRDT Node Server BLUE/GREEN 배포 시작"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

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

# nginx 설정 (zzik-nginx 컨테이너)
NGINX_CONTAINER="zzik-nginx"
NGINX_CONF_DIR="/etc/nginx/conf.d"
NGINX_SITE_NAME="crdt.zzik.kr"

# 디버그 모드 설정
DEBUG_MODE="${DEBUG_MODE:-false}"

# 롤백 플래그
DEPLOYMENT_FAILED=0
NEED_ROLLBACK=0
IMAGE_NAME="${IMAGE_NAME:-zzikgoga-node}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CURRENT_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
PREVIOUS_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}-previous"

# Cloudflare Tunnel 사용 - SSL은 Cloudflare가 처리
echo ""
echo "🔧 Nginx 설정 점검 중... (Cloudflare Tunnel 모드)"
echo ""

# 롤백 함수
rollback_deployment() {
  # trap 제거하여 롤백 중 재귀 방지
  trap - ERR
  echo ""
  echo "🔄 배포 실패! 롤백을 시작합니다..."

  # 새로 배포한 컨테이너 중지 및 제거
  if [ -n "${NEW_ENV:-}" ] && docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-node-${NEW_ENV}"; then
    echo "  🔥 새 컨테이너 중지: zzikgoga-node-${NEW_ENV}"
    docker compose -p node-${NEW_ENV} -f docker-compose-node-${NEW_ENV}.yml down 2>/dev/null || true
  fi

  if docker image inspect "${PREVIOUS_IMAGE}" >/dev/null 2>&1; then
    echo "  🔁 Docker 이미지 태그 복구: ${CURRENT_IMAGE} ← ${PREVIOUS_IMAGE}"
    docker tag "${PREVIOUS_IMAGE}" "${CURRENT_IMAGE}" || true
  fi

  # 이전 환경이 있었다면 복구
  if [ -n "${CURRENT_ENV:-}" ] && [ -n "${OLD_ENV:-}" ]; then
    echo "  ♻️ 이전 환경 복구 중: zzikgoga-node-${OLD_ENV}"

    # 이전 컨테이너가 중지되어 있다면 다시 시작
    if docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-node-${OLD_ENV}"; then
      if ! docker ps --format '{{.Names}}' | grep -qx "zzikgoga-node-${OLD_ENV}"; then
        echo "  🔄 이전 컨테이너 재시작 중... (이미지: ${OLD_IMAGE_ID:-unknown})"
        docker start "zzikgoga-node-${OLD_ENV}" 2>/dev/null || true
        sleep 5

        # 이전 컨테이너 헬스 체크 (WebSocket 서버용)
        echo "  ⏳ 이전 컨테이너 헬스 체크 대기..."
        for i in $(seq 1 30); do
          if docker logs "zzikgoga-node-${OLD_ENV}" 2>&1 | grep -q "y-websocket compatible server running"; then
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
      docker compose -p node-${OLD_ENV} -f docker-compose-node-${OLD_ENV}.yml up -d
      sleep 10
    fi

    # Nginx 설정도 이전 버전으로 복구
    if [ -f "$(pwd)/nginx/crdt-${OLD_ENV}.conf" ]; then
      echo "  🔧 Nginx 설정 복구 중..."
      docker cp "$(pwd)/nginx/crdt-${OLD_ENV}.conf" ${NGINX_CONTAINER}:${NGINX_CONF_DIR}/${NGINX_SITE_NAME}.conf
      if docker exec ${NGINX_CONTAINER} nginx -t 2>/dev/null; then
        docker exec ${NGINX_CONTAINER} nginx -s reload
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

# 현재 활성 환경 확인
CURRENT_ENV=""
BLUE_RUNNING=false
GREEN_RUNNING=false

if docker ps --format "table {{.Names}}" | grep -q "zzikgoga-node-blue"; then
    BLUE_RUNNING=true
fi

if docker ps --format "table {{.Names}}" | grep -q "zzikgoga-node-green"; then
    GREEN_RUNNING=true
fi

# 환경 상태에 따른 처리
if [ "$BLUE_RUNNING" = true ] && [ "$GREEN_RUNNING" = true ]; then
    echo "⚠️ 두 환경 모두 실행 중입니다. green 환경을 중지합니다..."
    docker compose -p node-green -f docker-compose-node-green.yml down
    CURRENT_ENV="blue"
elif [ "$BLUE_RUNNING" = true ]; then
    CURRENT_ENV="blue"
elif [ "$GREEN_RUNNING" = true ]; then
    CURRENT_ENV="green"
fi

# 새로운 환경 결정
if [ "$CURRENT_ENV" = "blue" ]; then
    NEW_ENV="green"
    NEW_PORT="4002"
    OLD_ENV="blue"
    OLD_PORT="4001"
else
    NEW_ENV="blue"
    NEW_PORT="4001"
    OLD_ENV="green"
    OLD_PORT="4002"
fi

echo "📋 현재: ${CURRENT_ENV:-없음} → 배포 대상: $NEW_ENV (포트 $NEW_PORT)"

# 시스템 리소스 확인
echo "📊 시스템 리소스 상태:"
free -h | head -3
docker system df | grep -E "TYPE|Images|Containers"
echo ""

# 이미지 존재 확인
if ! docker images | grep -q "zzikgoga-node.*latest"; then
    echo "❌ Docker 이미지가 없습니다: zzikgoga-node:latest"
    exit 1
fi

# 이전 컨테이너가 있다면 중지 (삭제는 하지 않음 - 롤백을 위해)
if [ "$CURRENT_ENV" != "" ]; then
  echo "⏸️ 이전 컨테이너 중지 (롤백 대비): zzikgoga-node-${OLD_ENV}"
  docker stop "zzikgoga-node-${OLD_ENV}" 2>/dev/null || true

  # 중지된 컨테이너의 이미지 ID 백업
  OLD_IMAGE_ID=$(docker inspect -f '{{.Image}}' "zzikgoga-node-${OLD_ENV}" 2>/dev/null || echo "")
  if [ -n "$OLD_IMAGE_ID" ]; then
    echo "💾 이전 컨테이너 이미지 ID 백업: ${OLD_IMAGE_ID}"
  fi
fi

# 새로운 환경 시작
echo "🎯 $NEW_ENV 환경 시작 중..."
docker compose -p node-${NEW_ENV} -f docker-compose-node-${NEW_ENV}.yml up -d

# 컨테이너 시작 대기
echo "⏳ 컨테이너 시작 대기중..."
sleep 5

# Health check (WebSocket 서버용 - 로그 메시지 기반)
echo "🏥 헬스 체크 시작... (WebSocket 서버)"
MAX_ATTEMPTS=30
ATTEMPT=0
SUCCESS=false
CONTAINER_NAME="zzikgoga-node-${NEW_ENV}"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))

    # Container status check
    CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

    if [ "$CONTAINER_STATUS" != "running" ]; then
        echo "⏳ 컨테이너 시작 대기 중... (시도 $ATTEMPT/$MAX_ATTEMPTS, 상태: $CONTAINER_STATUS)"
        sleep 3
        continue
    fi

    # WebSocket 서버 시작 로그 메시지 확인
    if docker logs "$CONTAINER_NAME" 2>&1 | grep -q "y-websocket compatible server running"; then
        echo "✅ $NEW_ENV 환경이 정상 상태입니다! (WebSocket 서버 시작 확인)"
        SUCCESS=true

        # 서버 정보 출력
        echo "🔍 WebSocket 서버 정보:"
        docker logs "$CONTAINER_NAME" 2>&1 | grep -E "(server running|listening|started)" | tail -5 || true
        echo ""

        break
    fi

    echo "⏳ WebSocket 서버 시작 대기 중... (시도 $ATTEMPT/$MAX_ATTEMPTS)"

    if [ $((ATTEMPT % 5)) -eq 0 ]; then
        echo "📋 진행 상황: $ATTEMPT/$MAX_ATTEMPTS 시도 완료"
        echo "🔍 컨테이너 로그 (최근 10줄):"
        docker logs "$CONTAINER_NAME" --tail 10 2>&1
        echo ""
    fi

    sleep 3
done

if [ "$SUCCESS" = false ]; then
    echo "❌ 헬스 체크 실패!"
    echo "📋 전체 컨테이너 로그:"
    docker logs "$CONTAINER_NAME" 2>&1

    NEED_ROLLBACK=1
    rollback_deployment
fi

echo "🔧 nginx 설정 업데이트 중... (zzik-nginx 컨테이너)"

# zzik-nginx가 zzik-network에 연결되어 있는지 확인
if docker ps --format '{{.Names}}' | grep -qx "${NGINX_CONTAINER}"; then
    if ! docker inspect "${NGINX_CONTAINER}" --format '{{json .NetworkSettings.Networks}}' | grep -q "${NETWORK_NAME}"; then
        echo "  ⚙️ ${NGINX_CONTAINER}를 ${NETWORK_NAME}에 연결 중..."
        docker network connect "${NETWORK_NAME}" "${NGINX_CONTAINER}" 2>/dev/null || true
    fi
fi

# 실행되지 않는 서비스의 nginx 설정 제거 (nginx -t 실패 방지)
echo "🧹 미실행 서비스 nginx 설정 정리..."
if ! docker ps --format '{{.Names}}' | grep -q "zzikgoga-nft-"; then
    echo "  - NFT 컨테이너 미실행: nft.zzik.kr.conf 제거"
    docker exec ${NGINX_CONTAINER} rm -f ${NGINX_CONF_DIR}/nft.zzik.kr.conf 2>/dev/null || true
fi
if ! docker ps --format '{{.Names}}' | grep -qE "(prometheus|grafana)"; then
    docker exec ${NGINX_CONTAINER} rm -f ${NGINX_CONF_DIR}/monitoring.zzik.kr.conf 2>/dev/null || true
fi

if [ -f "$(pwd)/nginx/crdt-${NEW_ENV}.conf" ]; then
    echo "✅ nginx 설정 파일 존재: $(pwd)/nginx/crdt-${NEW_ENV}.conf"

    # docker cp로 nginx 설정 업데이트
    docker cp "$(pwd)/nginx/crdt-${NEW_ENV}.conf" ${NGINX_CONTAINER}:${NGINX_CONF_DIR}/${NGINX_SITE_NAME}.conf

    if docker exec ${NGINX_CONTAINER} nginx -t; then
        docker exec ${NGINX_CONTAINER} nginx -s reload
        echo "✅ nginx 재로드 완료"
    else
        echo "❌ nginx 설정 테스트 실패"
        NEED_ROLLBACK=1
        rollback_deployment
    fi
else
    echo "⚠️ nginx 설정 파일이 없습니다: $(pwd)/nginx/crdt-${NEW_ENV}.conf"
    NEED_ROLLBACK=1
    rollback_deployment
fi

# 최종 확인 (WebSocket 서버용 - 로그 메시지 및 컨테이너 상태 확인)
echo "🔍 새 환경 최종 확인..."
FINAL_CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")
FINAL_LOG_CHECK=$(docker logs "$CONTAINER_NAME" 2>&1 | grep -c "y-websocket compatible server running" || echo "0")

if [ "$FINAL_CONTAINER_STATUS" = "running" ] && [ "$FINAL_LOG_CHECK" -gt 0 ]; then
    echo "✅ 최종 확인 완료 (컨테이너 실행 중, WebSocket 서버 정상)"
else
    echo "❌ 최종 확인 실패! (상태: $FINAL_CONTAINER_STATUS, 로그 확인: $FINAL_LOG_CHECK)"
    NEED_ROLLBACK=1
    rollback_deployment
fi

# 배포 성공 확인
echo "✅ 배포 성공 확인 완료"

# trap 해제 - 이제 롤백이 필요 없음
trap - ERR

# 기존 환경 종료 (성공 시에만)
if [ "$CURRENT_ENV" != "" ]; then
    echo "🛑 기존 $OLD_ENV 환경 중지 중..."
    sleep 10  # 트래픽 전환을 위한 대기
    docker compose -p node-${OLD_ENV} -f docker-compose-node-${OLD_ENV}.yml down --remove-orphans || true
fi

# 이미지 정리
echo "🧹 이미지 정리 중..."
docker image prune -f || true

echo ""
echo "🎉 CRDT Node Server 배포가 성공적으로 완료되었습니다!"
echo "   이전: ${CURRENT_ENV:-없음} → 신규: $NEW_ENV (포트 $NEW_PORT)"
echo "   완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# Final verification
echo ""
echo "📊 최종 상태:"
docker ps --filter "name=node-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 성공적으로 종료
exit 0
