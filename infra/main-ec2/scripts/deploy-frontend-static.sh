#!/bin/bash
# 프론트엔드 정적 파일 배포 스크립트
# zzik-nginx 컨테이너에 정적 파일 배포

set -e

DIST_DIR="$1"
NGINX_CONF="$2"
NGINX_CONTAINER="zzik-nginx"
NGINX_CONF_DIR="/etc/nginx/conf.d"
DEPLOY_PATH="/usr/share/nginx/zzik-frontend"
NETWORK_NAME="zzik-network"

if [ -z "$DIST_DIR" ] || [ ! -d "$DIST_DIR" ]; then
    echo "❌ 사용법: $0 <dist_dir> [nginx_conf]"
    exit 1
fi

echo "🚀 프론트엔드 배포 시작..."

# zzik-nginx 컨테이너 확인
if ! docker ps --format '{{.Names}}' | grep -qx "${NGINX_CONTAINER}"; then
    echo "❌ ${NGINX_CONTAINER} 컨테이너가 실행 중이지 않습니다"
    exit 1
fi

# zzik-nginx가 zzik-network에 연결되어 있는지 확인
if ! docker inspect "${NGINX_CONTAINER}" --format '{{json .NetworkSettings.Networks}}' | grep -q "${NETWORK_NAME}"; then
    echo "  ⚙️ ${NGINX_CONTAINER}를 ${NETWORK_NAME}에 연결 중..."
    docker network connect "${NETWORK_NAME}" "${NGINX_CONTAINER}" 2>/dev/null || true
fi

# 기존 파일 백업 (컨테이너 내부)
echo "📦 기존 버전 백업 중..."
docker exec ${NGINX_CONTAINER} sh -c "
    if [ -d '${DEPLOY_PATH}' ]; then
        rm -rf ${DEPLOY_PATH}.previous 2>/dev/null || true
        mv ${DEPLOY_PATH} ${DEPLOY_PATH}.previous 2>/dev/null || true
    fi
    mkdir -p ${DEPLOY_PATH}
" || true

# 새 빌드 배포 (tar로 압축해서 복사)
echo "📁 정적 파일 복사 중..."
TEMP_TAR="/tmp/frontend-dist-$$.tar"
tar -cf "${TEMP_TAR}" -C "${DIST_DIR}" .
docker cp "${TEMP_TAR}" ${NGINX_CONTAINER}:/tmp/frontend-dist.tar
docker exec ${NGINX_CONTAINER} sh -c "
    tar -xf /tmp/frontend-dist.tar -C ${DEPLOY_PATH}
    rm -f /tmp/frontend-dist.tar
"
rm -f "${TEMP_TAR}"

# 빌드 정보 기록
echo "BUILD_DATE=$(date)" > /tmp/build-info.txt
echo "BRANCH=${BRANCH_NAME:-unknown}" >> /tmp/build-info.txt
echo "BUILD_NUMBER=${BUILD_NUMBER:-unknown}" >> /tmp/build-info.txt
docker cp /tmp/build-info.txt ${NGINX_CONTAINER}:${DEPLOY_PATH}/build-info.txt
rm -f /tmp/build-info.txt

echo "✅ 파일 배포 완료"

# Nginx 설정 업데이트 (선택)
if [ -n "$NGINX_CONF" ] && [ -f "$NGINX_CONF" ]; then
    echo "🔧 Nginx 설정 업데이트 중..."

    # 현재 활성화된 백엔드 컨테이너 감지
    ACTIVE_BACKEND=""
    if docker ps --format '{{.Names}}' | grep -qx 'zzikgoga-blue'; then
        ACTIVE_BACKEND="zzikgoga-blue"
    elif docker ps --format '{{.Names}}' | grep -qx 'zzikgoga-green'; then
        ACTIVE_BACKEND="zzikgoga-green"
    fi

    if [ -n "$ACTIVE_BACKEND" ]; then
        echo "  ✅ 활성 백엔드: ${ACTIVE_BACKEND}"
        # 백엔드가 zzik-network에 연결되어 있는지 확인
        docker network connect "${NETWORK_NAME}" "${ACTIVE_BACKEND}" 2>/dev/null || true

        # nginx 설정 파일에서 백엔드 주소 동적으로 변경
        TEMP_CONF="/tmp/frontend-nginx-$$.conf"
        sed "s/zzikgoga-blue/${ACTIVE_BACKEND}/g; s/zzikgoga-green/${ACTIVE_BACKEND}/g" "$NGINX_CONF" > "${TEMP_CONF}"
        docker cp "${TEMP_CONF}" ${NGINX_CONTAINER}:${NGINX_CONF_DIR}/zzik.kr.conf
        rm -f "${TEMP_CONF}"
    else
        echo "  ⚠️ 활성 백엔드 없음 - API 프록시 없이 정적 파일만 서빙"
        # 백엔드 없이 정적 파일만 서빙하는 설정 생성
        cat > /tmp/frontend-static-only.conf << 'STATICEOF'
server {
    listen 80;
    server_name zzik.kr zzik.store www.zzik.store;

    root /usr/share/nginx/zzik-frontend;
    index index.html;

    access_log /var/log/nginx/zzik.kr.access.log;
    error_log  /var/log/nginx/zzik.kr.error.log;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
STATICEOF
        docker cp /tmp/frontend-static-only.conf ${NGINX_CONTAINER}:${NGINX_CONF_DIR}/zzik.kr.conf
        rm -f /tmp/frontend-static-only.conf
    fi

    if docker exec ${NGINX_CONTAINER} nginx -t; then
        docker exec ${NGINX_CONTAINER} nginx -s reload
        echo "✅ Nginx 설정 업데이트 완료"
    else
        echo "❌ Nginx 설정 테스트 실패"
        # 롤백
        docker exec ${NGINX_CONTAINER} sh -c "
            if [ -d '${DEPLOY_PATH}.previous' ]; then
                rm -rf ${DEPLOY_PATH}
                mv ${DEPLOY_PATH}.previous ${DEPLOY_PATH}
            fi
        "
        exit 1
    fi
fi

echo "🎉 배포 완료!"
