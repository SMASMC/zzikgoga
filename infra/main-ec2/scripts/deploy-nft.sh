#!/bin/bash

set -e

echo "🚀 NFT Server BLUE/GREEN 배포 시작"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# nginx 설정 파일 경로
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_SITE_NAME="nft.zzik.kr"

# 디버그 모드 설정
DEBUG_MODE="${DEBUG_MODE:-false}"

# 롤백 플래그
DEPLOYMENT_FAILED=0
NEED_ROLLBACK=0
IMAGE_NAME="${IMAGE_NAME:-zzikgoga-nft}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CURRENT_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
PREVIOUS_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}-previous"

#############################################
# Nginx 설정 사전 정리 (SSL 문제 방지)
#############################################
echo ""
echo "🔧 Nginx 설정 사전 점검 중..."

# SSL 인증서 확인 (sudo 권한으로 확인 - /etc/letsencrypt는 root만 접근 가능)
SSL_CERT="/etc/letsencrypt/live/nft.zzik.kr/fullchain.pem"
USE_HTTPS=false

if sudo test -f "$SSL_CERT"; then
    echo "✅ SSL 인증서 존재 - HTTPS 모드로 배포됩니다"
    USE_HTTPS=true
else
    echo "⚠️ SSL 인증서 없음 - HTTP 모드로 먼저 배포 후 HTTPS로 전환됩니다"
    USE_HTTPS=false
fi

# 기존 잘못된 HTTPS 설정이 있는지 확인
if [ -f "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}" ]; then
    if [ "$USE_HTTPS" = false ]; then
        # SSL 인증서가 없는데 HTTPS 설정이 있으면 정리
        if grep -q "listen 443 ssl" "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}" 2>/dev/null; then
            echo "  ⚠️ HTTPS 설정 발견 - 기존 nginx 설정 정리 중..."

            # 기존 설정 백업 및 제거
            sudo rm -f "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}" 2>/dev/null || true

            if [ -f "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}" ]; then
                BACKUP_NAME="${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}.backup.$(date +%Y%m%d-%H%M%S)"
                sudo mv "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}" "$BACKUP_NAME" 2>/dev/null || true
                echo "  📦 기존 설정 백업: $BACKUP_NAME"
            fi

            # nginx 테스트 및 리로드
            if sudo nginx -t 2>/dev/null; then
                sudo systemctl reload nginx 2>/dev/null || true
                echo "  ✅ 기존 설정 정리 완료"
            fi
        fi
    fi
else
    echo "  ℹ️ 기존 설정 없음 - 새로 생성됩니다"
fi

echo ""

# 롤백 함수
rollback_deployment() {
  # trap 제거하여 롤백 중 재귀 방지
  trap - ERR
  echo ""
  echo "🔄 배포 실패! 롤백을 시작합니다..."

  # 새로 배포한 컨테이너 중지 및 제거
  if [ -n "${NEW_ENV:-}" ] && docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-nft-${NEW_ENV}"; then
    echo "  🔥 새 컨테이너 중지: zzikgoga-nft-${NEW_ENV}"
    docker compose -p nft-${NEW_ENV} -f docker-compose-nft-${NEW_ENV}.yml down 2>/dev/null || true
  fi

  if docker image inspect "${PREVIOUS_IMAGE}" >/dev/null 2>&1; then
    echo "  🔁 Docker 이미지 태그 복구: ${CURRENT_IMAGE} ← ${PREVIOUS_IMAGE}"
    docker tag "${PREVIOUS_IMAGE}" "${CURRENT_IMAGE}" || true
  fi

  # 이전 환경이 있었다면 복구
  if [ -n "${CURRENT_ENV:-}" ] && [ -n "${OLD_ENV:-}" ]; then
    echo "  ♻️ 이전 환경 복구 중: zzikgoga-nft-${OLD_ENV}"

    # 이전 컨테이너가 중지되어 있다면 다시 시작
    if docker ps -a --format '{{.Names}}' | grep -qx "zzikgoga-nft-${OLD_ENV}"; then
      if ! docker ps --format '{{.Names}}' | grep -qx "zzikgoga-nft-${OLD_ENV}"; then
        echo "  🔄 이전 컨테이너 재시작 중... (이미지: ${OLD_IMAGE_ID:-unknown})"
        docker start "zzikgoga-nft-${OLD_ENV}" 2>/dev/null || true
        sleep 5

        # 이전 컨테이너 헬스 체크
        echo "  ⏳ 이전 컨테이너 헬스 체크 대기..."
        for i in $(seq 1 30); do
          if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${OLD_PORT}/health" | grep -q "^[234]"; then
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
      docker compose -p nft-${OLD_ENV} -f docker-compose-nft-${OLD_ENV}.yml up -d
      sleep 10
    fi

    # Nginx 설정도 이전 버전으로 복구
    echo "  🔧 Nginx 설정 복구 중..."

    # SSL 인증서 확인하여 적절한 설정 선택 (sudo로 확인)
    ROLLBACK_CONFIG=""
    if sudo test -f "$SSL_CERT"; then
      ROLLBACK_CONFIG="$(pwd)/nginx/nft-${OLD_ENV}.conf"
      echo "  📝 HTTPS 설정으로 복구: $ROLLBACK_CONFIG"
    else
      ROLLBACK_CONFIG="$(pwd)/nginx/nft-${OLD_ENV}-http.conf"
      echo "  📝 HTTP 설정으로 복구: $ROLLBACK_CONFIG"
    fi

    if [ -f "$ROLLBACK_CONFIG" ]; then
      sudo cp "$ROLLBACK_CONFIG" "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}"
      sudo ln -sf "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}" "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}"
      if sudo nginx -t 2>/dev/null; then
        sudo systemctl reload nginx
        echo "  ✅ Nginx 설정 복구 완료"
      fi
    else
      echo "  ⚠️ Nginx 설정 파일 없음: $ROLLBACK_CONFIG"
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

if docker ps --format "table {{.Names}}" | grep -q "zzikgoga-nft-blue"; then
    BLUE_RUNNING=true
fi

if docker ps --format "table {{.Names}}" | grep -q "zzikgoga-nft-green"; then
    GREEN_RUNNING=true
fi

# 환경 상태에 따른 처리
if [ "$BLUE_RUNNING" = true ] && [ "$GREEN_RUNNING" = true ]; then
    echo "⚠️ 두 환경 모두 실행 중입니다. green 환경을 중지합니다..."
    docker compose -p nft-green -f docker-compose-nft-green.yml down
    CURRENT_ENV="blue"
elif [ "$BLUE_RUNNING" = true ]; then
    CURRENT_ENV="blue"
elif [ "$GREEN_RUNNING" = true ]; then
    CURRENT_ENV="green"
fi

# 새로운 환경 결정
if [ "$CURRENT_ENV" = "blue" ]; then
    NEW_ENV="green"
    NEW_PORT="5002"
    OLD_ENV="blue"
    OLD_PORT="5001"
else
    NEW_ENV="blue"
    NEW_PORT="5001"
    OLD_ENV="green"
    OLD_PORT="5002"
fi

echo "📋 현재: ${CURRENT_ENV:-없음} → 배포 대상: $NEW_ENV (포트 $NEW_PORT)"

# 시스템 리소스 확인
echo "📊 시스템 리소스 상태:"
free -h | head -3
docker system df | grep -E "TYPE|Images|Containers"
echo ""

# 이미지 존재 확인
if ! docker images | grep -q "zzikgoga-nft.*latest"; then
    echo "❌ Docker 이미지가 없습니다: zzikgoga-nft:latest"
    exit 1
fi

# 이전 컨테이너가 있다면 중지 (삭제는 하지 않음 - 롤백을 위해)
if [ "$CURRENT_ENV" != "" ]; then
  echo "⏸️ 이전 컨테이너 중지 (롤백 대비): zzikgoga-nft-${OLD_ENV}"
  docker stop "zzikgoga-nft-${OLD_ENV}" 2>/dev/null || true

  # 중지된 컨테이너의 이미지 ID 백업
  OLD_IMAGE_ID=$(docker inspect -f '{{.Image}}' "zzikgoga-nft-${OLD_ENV}" 2>/dev/null || echo "")
  if [ -n "$OLD_IMAGE_ID" ]; then
    echo "💾 이전 컨테이너 이미지 ID 백업: ${OLD_IMAGE_ID}"
  fi
fi

# 새로운 환경 시작
echo "🎯 $NEW_ENV 환경 시작 중..."
docker compose -p nft-${NEW_ENV} -f docker-compose-nft-${NEW_ENV}.yml up -d

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
    CONTAINER_NAME="zzikgoga-nft-${NEW_ENV}"
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
        echo "   /health 상태 코드: $HEALTH_CODE"

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

# HTTP 또는 HTTPS 설정 선택
if [ "$USE_HTTPS" = true ]; then
    NGINX_CONFIG_FILE="$(pwd)/nginx/nft-${NEW_ENV}.conf"
    echo "📝 HTTPS 설정 사용: $NGINX_CONFIG_FILE"
else
    NGINX_CONFIG_FILE="$(pwd)/nginx/nft-${NEW_ENV}-http.conf"
    echo "📝 HTTP 설정 사용: $NGINX_CONFIG_FILE"
fi

if [ -f "$NGINX_CONFIG_FILE" ]; then
    echo "✅ nginx 설정 파일 존재: $NGINX_CONFIG_FILE"

    # sudo 권한으로 nginx 설정 업데이트
    sudo cp "$NGINX_CONFIG_FILE" "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}"
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
    echo "⚠️ nginx 설정 파일이 없습니다: $NGINX_CONFIG_FILE"
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

# trap 해제 - 이제 롤백이 필요 없음
trap - ERR

#############################################
# SSL 인증서 자동 발급 및 HTTPS 전환
#############################################
if [ "$USE_HTTPS" = false ]; then
    echo ""
    echo "🔒 SSL 인증서 자동 발급 시작..."

    # certbot으로 SSL 인증서 발급
    if sudo certbot certonly --nginx -d nft.zzik.kr --non-interactive --agree-tos --email admin@zzik.kr 2>&1 | tee /tmp/certbot-output.log; then
        # 인증서 발급 성공 확인 (sudo로 확인)
        if sudo test -f "/etc/letsencrypt/live/nft.zzik.kr/fullchain.pem"; then
            echo "✅ SSL 인증서 발급 성공!"

            # HTTPS nginx 설정으로 전환
            echo "🔄 HTTPS 설정으로 전환 중..."
            HTTPS_CONFIG="$(pwd)/nginx/nft-${NEW_ENV}.conf"

            if [ -f "$HTTPS_CONFIG" ]; then
                sudo cp "$HTTPS_CONFIG" "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}"
                sudo ln -sf "${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}" "${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}"

                if sudo nginx -t 2>&1; then
                    sudo systemctl reload nginx
                    echo "✅ HTTPS 전환 완료!"
                    echo "🌐 서비스 URL: https://nft.zzik.kr"
                else
                    echo "⚠️ HTTPS 설정 테스트 실패 - HTTP로 유지됩니다"
                    echo "   수동으로 확인이 필요합니다"
                fi
            else
                echo "⚠️ HTTPS 설정 파일 없음: $HTTPS_CONFIG"
            fi
        else
            echo "⚠️ SSL 인증서 파일을 찾을 수 없습니다"
            echo "   HTTP로 배포가 완료되었습니다"
        fi
    else
        echo "⚠️ SSL 인증서 발급 실패"
        echo "   HTTP로 배포가 완료되었습니다"
        echo "   수동으로 발급: sudo certbot certonly --nginx -d nft.zzik.kr"

        # certbot 로그 확인
        if [ -f /tmp/certbot-output.log ]; then
            echo "📋 Certbot 로그 (마지막 10줄):"
            tail -10 /tmp/certbot-output.log
        fi
    fi
    echo ""
fi

# 기존 환경 종료 (성공 시에만)
if [ "$CURRENT_ENV" != "" ]; then
    echo "🛑 기존 $OLD_ENV 환경 중지 중..."
    sleep 10  # 트래픽 전환을 위한 대기
    docker compose -p nft-${OLD_ENV} -f docker-compose-nft-${OLD_ENV}.yml down --remove-orphans || true
fi

# 이미지 정리
echo "🧹 이미지 정리 중..."
docker image prune -f || true

echo ""
echo "🎉 NFT Server 배포가 성공적으로 완료되었습니다!"
echo "   이전: ${CURRENT_ENV:-없음} → 신규: $NEW_ENV (포트 $NEW_PORT)"
echo "   완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# Final verification
echo ""
echo "📊 최종 상태:"
docker ps --filter "name=nft-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 성공적으로 종료
exit 0
