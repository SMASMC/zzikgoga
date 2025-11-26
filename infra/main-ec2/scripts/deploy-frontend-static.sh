#!/bin/bash
# 프론트엔드 정적 파일 배포 스크립트
# Jenkins에서 sudo로 실행

set -e

DIST_DIR="$1"
DEPLOY_DIR="/var/www/zzik-frontend"
NGINX_CONF="$2"

if [ -z "$DIST_DIR" ] || [ ! -d "$DIST_DIR" ]; then
    echo "❌ 사용법: $0 <dist_dir> [nginx_conf]"
    exit 1
fi

echo "🚀 프론트엔드 배포 시작..."

# 배포 디렉토리 준비
mkdir -p ${DEPLOY_DIR}

# 기존 파일 백업 (롤백용)
if [ -d "${DEPLOY_DIR}/current" ]; then
    rm -rf ${DEPLOY_DIR}/previous
    mv ${DEPLOY_DIR}/current ${DEPLOY_DIR}/previous
    echo "📦 이전 버전 백업 완료"
fi

# 새 빌드 배포
mkdir -p ${DEPLOY_DIR}/current
cp -r ${DIST_DIR}/* ${DEPLOY_DIR}/current/

# 빌드 정보 기록
echo "BUILD_DATE=$(date)" > ${DEPLOY_DIR}/current/build-info.txt
echo "BRANCH=${BRANCH_NAME:-unknown}" >> ${DEPLOY_DIR}/current/build-info.txt
echo "BUILD_NUMBER=${BUILD_NUMBER:-unknown}" >> ${DEPLOY_DIR}/current/build-info.txt

# 권한 설정
chown -R www-data:www-data ${DEPLOY_DIR}/current
chmod -R 755 ${DEPLOY_DIR}/current

echo "✅ 파일 배포 완료"

# Nginx 설정 업데이트 (선택)
if [ -n "$NGINX_CONF" ] && [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" /etc/nginx/sites-available/zzik.kr
    ln -sf /etc/nginx/sites-available/zzik.kr /etc/nginx/sites-enabled/zzik.kr
    nginx -t && systemctl reload nginx
    echo "✅ Nginx 설정 업데이트 완료"
fi

echo "🎉 배포 완료!"
