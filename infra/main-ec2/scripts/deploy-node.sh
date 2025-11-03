#!/bin/bash

set -e

echo "🚀 CRDT Node Server BLUE/GREEN 배포 시작"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# nginx 설정 파일 경로
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_SITE_NAME="crdt.zzik.kr"

# 디버그 모드 설정
DEBUG_MODE="${DEBUG_MODE:-false}"

# 롤백 플래그
DEPLOYMENT_FAILED=0
NEED_ROLLBACK=0

# 롤백 함수
rollback_deployment() {
  echo ""
  echo "🔄 배포 실패! 롤백을 시작합니다..."

  # 새로 배포한 컨테이너 중지 및 제거
  if [ -n "${NEW_ENV:-}" ] && docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-node-${NEW_ENV}"; then
    echo "  🛑 새 컨테이너 중지 중: zzikgoga-node-${NEW_ENV}"
    docker compose -p node-${NEW_ENV} -f docker-compose-node-${NEW_ENV}.yml down 2>/dev/null || true
  fi

  # 이전 환경이 있었다면 복구
  if [ -n "${CURRENT_ENV:-}" ] && [ -n "${OLD_ENV:-}" ]; then
    echo "  ♻️ 이전 환경 복구 중: zzikgoga-node-${OLD_ENV}"

    # 이전 컨테이너가 중지되어 있다면 다시 시작
    if docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-node-${OLD_ENV}"; then
      if ! docker ps --format '{{.Names}}' | grep -qx "zzikgoga-node-${OLD_ENV}"; then
        echo "  🔄 이전 컨테이너 재시작 중..."
        docker start "zzikgoga-node-${OLD_ENV}" 2>/dev/null || true
        sleep 5

        # 이전 컨테이너 헬스 체크
        for i in $(seq 1 30); do
          if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${OLD_PORT}/health" | grep -q "^[234]"; then
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
      docker compose -p node-${OLD_ENV} -f docker-compose-node-${OLD_ENV}.yml up -d
      sleep 10
    fi

    # Nginx 설정도 이전 버전으로 복구
    if [ -f "$(pwd)/nginx/node-${OLD_ENV}.conf" ]; then
      echo "  🔧 Nginx 설정 복구 중..."
      sudo cp "$(pwd)/nginx/node-${OLD_ENV}.conf" "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}"
      sudo ln -sf "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}" "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}"
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

# 새로운 환경 시작
echo "🎯 $NEW_ENV 환경 시작 중..."
docker compose -p node-${NEW_ENV} -f docker-compose-node-${NEW_ENV}.yml up -d

# 컨테이너 시작 대기
echo "⏳ 컨테이너 시작 대기중..."
sleep 5

# Health check
echo "🏥 헬스 체크 시작..."
MAX_ATTEMPTS=30
ATTEMPT=0
SUCCESS=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))

    # Container status check
    CONTAINER_NAME="zzikgoga-node-${NEW_ENV}"
    CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown")

    if [ "$CONTAINER_STATUS" != "running" ]; then
        echo "⏳ 컨테이너 시작 대기 중... (시도 $ATTEMPT/$MAX_ATTEMPTS, 상태: $CONTAINER_STATUS)"
        sleep 3
        continue
    fi

    # Health check: try /health then fallback to /
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}/health 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "000" ] || [ "$HTTP_CODE" = "404" ]; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}/ 2>/dev/null || echo "000")
    fi

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $NEW_ENV 환경이 정상 상태입니다!"
        SUCCESS=true

        # 추가 확인
        echo "🔍 엔드포인트 확인:"
        HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}/health 2>/dev/null || echo "000")
        STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}/status 2>/dev/null || echo "000")
        echo "   /health 상태 코드: $HEALTH_CODE"
        echo "   /status 상태 코드: $STATUS_CODE"

        # Health check 응답 내용 확인
        echo "🔍 Health check 응답:"
        curl -s http://localhost:${NEW_PORT}/health | jq '.' || true
        echo ""

        break
    fi

    echo "⏳ 헬스 체크 대기 중... (시도 $ATTEMPT/$MAX_ATTEMPTS, HTTP 상태: $HTTP_CODE)"

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

echo "🔧 nginx 설정 업데이트 중..."
if [ -f "$(pwd)/nginx/node-${NEW_ENV}.conf" ]; then
    echo "✅ nginx 설정 파일 존재: $(pwd)/nginx/node-${NEW_ENV}.conf"

    # sudo 권한으로 nginx 설정 업데이트
    sudo cp "$(pwd)/nginx/node-${NEW_ENV}.conf" "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}"
    sudo ln -sf "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}" "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}"

    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "✅ nginx 재로드 완료"
    else
        echo "❌ nginx 설정 테스트 실패"
        NEED_ROLLBACK=1
        rollback_deployment
    fi
else
    echo "⚠️ nginx 설정 파일이 없습니다: $(pwd)/nginx/node-${NEW_ENV}.conf"
    NEED_ROLLBACK=1
    rollback_deployment
fi

# 최종 확인
echo "🔍 새 환경 최종 확인..."
FINAL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}/health)
if [ "$FINAL_CHECK" != "200" ]; then
    FINAL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}/)
fi

case "$FINAL_CHECK" in
  2*|3*) : ;; # ok
  *)
    echo "❌ 최종 확인 실패!"
    NEED_ROLLBACK=1
    rollback_deployment
    ;;
esac

# 배포 성공 확인
echo "✅ 배포 성공 확인 완료"

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
