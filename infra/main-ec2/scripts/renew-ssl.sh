#!/bin/bash
set -e

# SSL 인증서 자동 갱신 스크립트
# Let's Encrypt 인증서는 90일 유효, 30일 전부터 갱신 가능
# Cron으로 매일 실행 권장: 0 3 * * * /path/to/renew-ssl.sh

echo "🔐 SSL 인증서 자동 갱신 시작"
echo "⏰ 실행 시간: $(date '+%Y-%m-%d %H:%M:%S')"

# Certbot 데이터 경로
CERTBOT_PATH="/etc/letsencrypt"
WEBROOT_PATH="/var/www/certbot"

# 색상 출력
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 루트 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 이 스크립트는 root 권한이 필요합니다.${NC}"
    exit 1
fi

# Docker 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"
    exit 1
fi

# 인증서 갱신 (30일 이내 만료 예정인 경우만)
echo "🔄 인증서 갱신 확인 중..."
docker run --rm \
    -v $CERTBOT_PATH:/etc/letsencrypt \
    -v /var/lib/letsencrypt:/var/lib/letsencrypt \
    -v $WEBROOT_PATH:/var/www/certbot \
    certbot/certbot:latest \
    renew --quiet

RENEW_STATUS=$?

if [ $RENEW_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ 인증서 갱신 완료 (또는 갱신 불필요)${NC}"

    # Nginx 재로드 (인증서가 갱신되었을 경우)
    if nginx -t 2>/dev/null; then
        nginx -s reload
        echo -e "${GREEN}✅ Nginx 설정 재로드 완료${NC}"
    else
        echo -e "${RED}❌ Nginx 설정 검증 실패!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ 인증서 갱신 실패 (상태 코드: $RENEW_STATUS)${NC}"
    exit 1
fi

# 인증서 만료 일자 확인 및 출력
echo ""
echo "📋 현재 인증서 만료 일자:"
echo "========================================="

# 모든 인증서 정보 출력
docker run --rm \
    -v $CERTBOT_PATH:/etc/letsencrypt \
    certbot/certbot:latest \
    certificates | grep -E "(Certificate Name|Expiry Date)" | while read line; do
    echo "$line"
done

echo "========================================="
echo ""
echo -e "${GREEN}🎉 SSL 인증서 갱신 작업 완료!${NC}"
echo "⏰ 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"
