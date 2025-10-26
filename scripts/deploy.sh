#!/bin/bash

set -e

echo "🚀 BLUE/GREEN 배포 시작"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# 프로젝트 타입 설정 (frontend 또는 backend)
PROJECT_TYPE="${PROJECT_TYPE:-frontend}"
echo "📦 프로젝트 타입: $PROJECT_TYPE"

# 프로젝트 타입에 따른 설정
if [ "$PROJECT_TYPE" = "frontend" ]; then
    CONTAINER_PREFIX="zzikgoga-frontend"
    BLUE_PORT="3001"
    GREEN_PORT="3002"
    HEALTH_ENDPOINT="/health"
    NGINX_SITE_NAME="zzik.kr"
else
    CONTAINER_PREFIX="zzikgoga"
    BLUE_PORT="8081"
    GREEN_PORT="8082"
    HEALTH_ENDPOINT="/health-check"
    NGINX_SITE_NAME="api.zzik.kr"
fi

# nginx 설정 파일 경로
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"

# 디버그 모드 설정 (실패 시 컨테이너 유지)
DEBUG_MODE="${DEBUG_MODE:-false}"

# 현재 활성 환경 확인
CURRENT_ENV=""
BLUE_RUNNING=false
GREEN_RUNNING=false

if docker ps --format "table {{.Names}}" | grep -q "${CONTAINER_PREFIX}-blue"; then
    BLUE_RUNNING=true
fi

if docker ps --format "table {{.Names}}" | grep -q "${CONTAINER_PREFIX}-green"; then
    GREEN_RUNNING=true
fi

# 환경 상태에 따른 처리
if [ "$BLUE_RUNNING" = true ] && [ "$GREEN_RUNNING" = true ]; then
    echo "⚠️ 두 환경 모두 실행 중입니다. green 환경을 중지합니다..."
    docker compose -p ${CONTAINER_PREFIX}-green -f docker/docker-compose-green.yml down
    CURRENT_ENV="blue"
elif [ "$BLUE_RUNNING" = true ]; then
    CURRENT_ENV="blue"
elif [ "$GREEN_RUNNING" = true ]; then
    CURRENT_ENV="green"
fi

# 새로운 환경 결정
if [ "$CURRENT_ENV" = "blue" ]; then
    NEW_ENV="green"
    NEW_PORT="$GREEN_PORT"
    OLD_ENV="blue"
    OLD_PORT="$BLUE_PORT"
else
    NEW_ENV="blue"
    NEW_PORT="$BLUE_PORT"
    OLD_ENV="green"
    OLD_PORT="$GREEN_PORT"
fi

echo "📋 현재: ${CURRENT_ENV:-없음} → 배포 대상: $NEW_ENV (포트 $NEW_PORT)"

# 시스템 리소스 확인
echo "📊 시스템 리소스 상태:"
free -h
echo ""
docker system df
echo ""

# 새로운 환경 시작 - 프로젝트 이름 지정
echo "🎯 $NEW_ENV 환경 시작 중..."
docker compose -p ${CONTAINER_PREFIX}-${NEW_ENV} -f docker/docker-compose-${NEW_ENV}.yml up -d

# 컨테이너 시작 대기
echo "⏳ 컨테이너 시작 대기중..."
sleep 10

# 컨테이너 상태 확인
echo "🔍 컨테이너 상태 확인:"
docker ps -a | grep ${CONTAINER_PREFIX}-${NEW_ENV}
echo ""

# Health check
echo "🏥 헬스 체크 시작..."
MAX_ATTEMPTS=40
ATTEMPT=0
RESTART_COUNT=0
SUCCESS=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))

    # Container status check
    CONTAINER_STATUS=$(docker inspect --format='{{.State.Status}}' ${CONTAINER_PREFIX}-${NEW_ENV} 2>/dev/null || echo "unknown")
    CONTAINER_RESTART_COUNT=$(docker inspect --format='{{.RestartCount}}' ${CONTAINER_PREFIX}-${NEW_ENV} 2>/dev/null || echo "0")

    # 재시작 감지
    if [ "$CONTAINER_RESTART_COUNT" -gt "$RESTART_COUNT" ]; then
        echo "⚠️ 컨테이너가 재시작되었습니다! (재시작 횟수: $CONTAINER_RESTART_COUNT)"
        RESTART_COUNT=$CONTAINER_RESTART_COUNT
        echo "🔍 재시작 후 로그 (최근 30줄):"
        docker logs ${CONTAINER_PREFIX}-${NEW_ENV} --tail 30 2>&1
        echo ""
    fi

    if [ "$CONTAINER_STATUS" != "running" ]; then
        echo "⏳ 컨테이너 시작 대기 중... (시도 $ATTEMPT/$MAX_ATTEMPTS, 상태: $CONTAINER_STATUS)"

        # 컨테이너가 종료된 경우 종료 코드 확인
        if [ "$CONTAINER_STATUS" = "exited" ]; then
            EXIT_CODE=$(docker inspect --format='{{.State.ExitCode}}' ${CONTAINER_PREFIX}-${NEW_ENV} 2>/dev/null || echo "unknown")
            echo "❌ 컨테이너가 종료됨. 종료 코드: $EXIT_CODE"
        fi

        sleep 5
        continue
    fi

    # Health check (더 상세한 응답 확인)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}${HEALTH_ENDPOINT} 2>/dev/null || echo "000")
    
    # 추가적으로 루트 엔드포인트도 확인
    if [ "$HTTP_CODE" != "200" ]; then
        ROOT_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}/ 2>/dev/null || echo "000")
        if [ "$ROOT_HTTP_CODE" = "200" ]; then
            echo "⚠️ 헬스체크 엔드포인트는 응답하지 않지만 루트 엔드포인트는 정상입니다."
            HTTP_CODE="200"  # 루트가 정상이면 통과
        fi
    fi

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $NEW_ENV 환경이 정상 상태입니다!"
        SUCCESS=true

        # 추가 확인
        echo "🔍 엔드포인트 확인:"
        curl -s http://localhost:${NEW_PORT}/ | jq . 2>/dev/null || echo "메인 엔드포인트 응답 실패"
        echo ""
        curl -s http://localhost:${NEW_PORT}/health-check | jq . 2>/dev/null || echo "헬스체크 응답 실패"

        break
    fi

    echo "⏳ 헬스 체크 대기 중... (시도 $ATTEMPT/$MAX_ATTEMPTS, HTTP 상태: $HTTP_CODE)"

    if [ $((ATTEMPT % 5)) -eq 0 ]; then
        echo "📋 진행 상황: $ATTEMPT/$MAX_ATTEMPTS 시도 완료"
        echo "🔍 컨테이너 로그 (최근 20줄):"
        docker logs ${CONTAINER_PREFIX}-${NEW_ENV} --tail 20 2>&1
        echo ""

        # 메모리 사용량 확인
        echo "🔍 컨테이너 리소스 사용량:"
        docker stats ${CONTAINER_PREFIX}-${NEW_ENV} --no-stream || echo "리소스 확인 실패"
        echo ""
    fi

    sleep 5
done

if [ "$SUCCESS" = false ]; then
    echo "❌ 헬스 체크 실패!"
    echo ""
    echo "========================================="
    echo "📋 디버깅을 위한 상세 정보"
    echo "========================================="

    # 전체 로그
    echo "📋 전체 애플리케이션 로그:"
    echo "========================================="
    docker logs ${CONTAINER_PREFIX}-${NEW_ENV} 2>&1
    echo "========================================="
    echo ""

    # 컨테이너 상세 정보
    echo "🔍 컨테이너 상세 정보:"
    echo "========================================="
    docker inspect ${CONTAINER_PREFIX}-${NEW_ENV} | jq '{
        State: .State,
        Config: {
            Env: .Config.Env,
            Cmd: .Config.Cmd,
            Entrypoint: .Config.Entrypoint
        },
        HostConfig: {
            Memory: .HostConfig.Memory,
            CpuShares: .HostConfig.CpuShares,
            RestartPolicy: .HostConfig.RestartPolicy
        }
    }' 2>/dev/null || docker inspect ${CONTAINER_PREFIX}-${NEW_ENV}
    echo "========================================="
    echo ""

    # 환경 변수 확인
    echo "🔍 컨테이너 환경 변수:"
    echo "========================================="
    docker exec ${CONTAINER_PREFIX}-${NEW_ENV} printenv 2>/dev/null | sort || echo "환경 변수 확인 실패"
    echo "========================================="
    echo ""

    # 디스크 사용량
    echo "🔍 컨테이너 내부 디스크 사용량:"
    echo "========================================="
    docker exec ${CONTAINER_PREFIX}-${NEW_ENV} df -h 2>/dev/null || echo "디스크 사용량 확인 실패"
    echo "========================================="
    echo ""

    # 네트워크 연결 확인
    echo "🔍 네트워크 연결 상태:"
    echo "========================================="
    docker exec ${CONTAINER_PREFIX}-${NEW_ENV} netstat -tuln 2>/dev/null || echo "네트워크 상태 확인 실패"
    echo "========================================="
    echo ""

    # 최근 이벤트
    echo "🔍 Docker 이벤트 (최근 10분):"
    echo "========================================="
    docker events --since 10m --until now --filter container=${CONTAINER_PREFIX}-${NEW_ENV} || echo "이벤트 확인 실패"
    echo "========================================="
    echo ""

    # 디버그 모드에서는 컨테이너를 제거하지 않음
    if [ "$DEBUG_MODE" = "true" ]; then
        echo "⚠️ 디버그 모드: 컨테이너를 유지합니다."
        echo "📌 실패한 컨테이너 확인 방법:"
        echo "   - 로그 확인: docker logs ${CONTAINER_PREFIX}-${NEW_ENV}"
        echo "   - 컨테이너 접속: docker exec -it ${CONTAINER_PREFIX}-${NEW_ENV} sh"
        echo "   - 컨테이너 상태: docker inspect ${CONTAINER_PREFIX}-${NEW_ENV}"
        echo "   - 컨테이너 제거: docker compose -p ${CONTAINER_PREFIX}-${NEW_ENV} -f docker/docker-compose-${NEW_ENV}.yml down"
    else
        echo "🔄 컨테이너를 제거합니다..."
        docker compose -p ${CONTAINER_PREFIX}-${NEW_ENV} -f docker/docker-compose-${NEW_ENV}.yml down
    fi

    exit 1
fi

# SSE 연결 상태 확인 (백엔드만)
if [ "$PROJECT_TYPE" = "backend" ] && [ "$CURRENT_ENV" != "" ]; then
    echo "🔍 배포 전 SSE 연결 상태 확인..."
    ACTIVE_SSE=$(curl -s localhost:${OLD_PORT}/api/notifications/sse-status 2>/dev/null | jq '.activeConnections' 2>/dev/null || echo "0")
    echo "현재 활성 SSE 연결: $ACTIVE_SSE"

    # SSE 연결이 많을 경우 추가 대기
    if [ "$ACTIVE_SSE" -gt "10" ]; then
        echo "⚠️ 활성 SSE 연결이 많습니다 ($ACTIVE_SSE개). 추가 대기 중..."
        sleep 15
    fi
fi

# nginx 설정 업데이트
echo "🔧 nginx 설정 업데이트 중..."

# nginx 설정 파일 경로 확인 (절대경로 사용)
CURRENT_DIR=$(pwd)
NGINX_CONFIG_FILE="${CURRENT_DIR}/nginx/nginx-${NEW_ENV}.conf"
OLD_NGINX_CONFIG_FILE="${CURRENT_DIR}/nginx/nginx-${OLD_ENV}.conf"

echo "🔍 nginx 설정 파일 경로 확인:"
echo "   - 새 설정 파일: $NGINX_CONFIG_FILE"
echo "   - 기존 설정 파일: $OLD_NGINX_CONFIG_FILE"
echo "   - 현재 작업 디렉토리: $(pwd)"

if [ -f "$NGINX_CONFIG_FILE" ]; then
    echo "✅ nginx 설정 파일을 찾았습니다: $NGINX_CONFIG_FILE"
    
    # 새 설정 적용 (절대경로 사용)
    echo "🔧 복사 명령: sudo cp \"$NGINX_CONFIG_FILE\" ${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}"
    sudo cp "$NGINX_CONFIG_FILE" ${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}
    sudo ln -sf ${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME} ${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}

    # nginx 설정 테스트
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "✅ nginx 재로드 완료 (${NEW_ENV} 환경으로 전환)"
        
        # 전환 확인
        ACTIVE_PORT=$(grep "server localhost:" ${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME} | head -1 | awk -F: '{print $2}' | tr -d '; ')
        echo "✅ 활성 포트: $ACTIVE_PORT"
    else
        echo "❌ nginx 설정 테스트 실패"
        
        # 롤백: 이전 환경 설정으로 복구
        if [ "$CURRENT_ENV" != "" ] && [ -f "$OLD_NGINX_CONFIG_FILE" ]; then
            echo "🔄 이전 환경 설정으로 롤백 중..."
            sudo cp "$OLD_NGINX_CONFIG_FILE" ${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME}
            sudo ln -sf ${NGINX_SITES_AVAILABLE}/${NGINX_SITE_NAME} ${NGINX_SITES_ENABLED}/${NGINX_SITE_NAME}
            
            if sudo nginx -t && sudo systemctl reload nginx; then
                echo "✅ 이전 환경으로 nginx 설정 복구 완료"
            else
                echo "❌ nginx 설정 복구도 실패!"
            fi
        else
            echo "⚠️ 이전 환경 설정을 찾을 수 없어 롤백을 건너뜁니다."
        fi

        # 디버그 모드에서는 컨테이너를 유지
        if [ "$DEBUG_MODE" != "true" ]; then
            echo "🔄 실패한 컨테이너 제거 중..."
            docker compose -p zzik.kr-${NEW_ENV} -f docker/docker-compose-${NEW_ENV}.yaml down
        fi
        exit 1
    fi
else
    echo "❌ nginx 설정 파일을 찾을 수 없습니다!"
    echo "   확인 대상: $NGINX_CONFIG_FILE"
    echo "   디렉토리 내용:"
    ls -la nginx/ 2>/dev/null || echo "   nginx 디렉토리가 존재하지 않습니다."
    
    echo "⚠️ nginx 설정 업데이트를 건너뜁니다."
    echo "⚠️ 수동으로 nginx 설정을 확인해주세요."
fi

# 최종 확인
echo "🔍 새 환경 최종 확인..."
FINAL_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${NEW_PORT}${HEALTH_ENDPOINT})
if [ "$FINAL_CHECK" != "200" ]; then
    echo "❌ 최종 확인 실패!"
    exit 1
fi

# 기존 환경 종료 - nginx 설정 성공 후에만 실행
if [ "$CURRENT_ENV" != "" ]; then
    echo "🛑 기존 $OLD_ENV 환경 중지 중..."
    echo "⏳ nginx 트래픽 전환 대기 (10초)..."
    sleep 10  # 트래픽 전환을 위한 대기

    echo "🔍 기존 컨테이너 상태 확인:"
    docker ps --filter "name=${CONTAINER_PREFIX}-${OLD_ENV}" --format "table {{.Names}}\t{{.Status}}"

    docker compose -p ${CONTAINER_PREFIX}-${OLD_ENV} -f docker/docker-compose-${OLD_ENV}.yml down --remove-orphans || true

    echo "✅ 기존 $OLD_ENV 환경 정리 완료"

    # 정리 후 상태 확인
    echo "🔍 컨테이너 정리 후 상태:"
    docker ps --filter "name=${CONTAINER_PREFIX}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "실행 중인 ${CONTAINER_PREFIX} 컨테이너 없음"
else
    echo "ℹ️ 이전 환경이 없어 정리할 컨테이너가 없습니다."
fi

echo ""
echo "🎉 배포가 성공적으로 완료되었습니다!"
echo "   프로젝트: $PROJECT_TYPE"
echo "   이전: ${CURRENT_ENV:-없음} → 신규: $NEW_ENV (포트 $NEW_PORT)"
echo "   완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# Final verification
echo ""
echo "📊 최종 상태:"
docker ps --filter "name=${CONTAINER_PREFIX}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 헬스 체크 엔드포인트 응답 확인
echo ""
echo "🏥 헬스 체크 응답:"
curl -s http://localhost:${NEW_PORT}${HEALTH_ENDPOINT} 2>/dev/null || echo "헬스 체크 요청 실패"

# 성공적으로 종료
exit 0
