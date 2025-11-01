#!/bin/bash
set -e

echo "========================================="
echo "🔐 Docker Certbot SSL 인증서 발급 및 HTTPS 설정"
echo "========================================="
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 도메인 설정
DOMAINS_FRONTEND="zzik.kr www.zzik.kr"
DOMAINS_BACKEND="api.zzik.kr"
DOMAINS_JENKINS="jenkins.zzik.kr"
DOMAINS_GRAFANA="${DOMAINS_GRAFANA:-monitoring.zzik.kr}"
EMAIL="${EMAIL:-trip325325@gmail.com}"

# 경로 설정
CERTBOT_PATH="/etc/letsencrypt"
WEBROOT_PATH="/var/www/certbot"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_EC2_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 루트 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ 이 스크립트는 root 권한이 필요합니다.${NC}"
    echo "   다음 명령으로 실행하세요: sudo bash $0"
    exit 1
fi

#############################################
# 0. Nginx 설정 정리 및 Jenkins Sudo 권한 설정
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🧹 Step 0: 환경 초기화${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 0-1. Broken symlink 제거
echo "📌 Nginx broken symlink 제거 중..."
rm -f /etc/nginx/sites-enabled/zzik.kr.conf
rm -f /etc/nginx/sites-enabled/api.zzik.kr.conf
rm -f /etc/nginx/sites-enabled/jenkins.zzik.kr.conf
rm -f /etc/nginx/sites-available/zzik.kr.conf
echo -e "${GREEN}✅ Broken symlink 제거 완료${NC}"
echo ""

# 0-2. Jenkins Sudo 권한 설정
echo "📌 Jenkins sudo 권한 설정 중..."
SUDOERS_FILE="/etc/sudoers.d/jenkins"
if [ ! -f "$SUDOERS_FILE" ]; then
    cat > "$SUDOERS_FILE" << 'SUDOEOF'
# Jenkins deployment sudo permissions
jenkins ALL=(ALL) NOPASSWD: /usr/sbin/nginx
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl start nginx
jenkins ALL=(ALL) NOPASSWD: /bin/systemctl stop nginx
jenkins ALL=(ALL) NOPASSWD: /bin/cp
jenkins ALL=(ALL) NOPASSWD: /bin/ln
jenkins ALL=(ALL) NOPASSWD: /bin/rm
SUDOEOF
    chmod 440 "$SUDOERS_FILE"
    if visudo -c -f "$SUDOERS_FILE" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Jenkins sudo 권한 설정 완료${NC}"
    else
        echo -e "${RED}❌ Sudoers 검증 실패${NC}"
        rm -f "$SUDOERS_FILE"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️ Jenkins sudoers 설정 이미 존재${NC}"
fi
echo ""

# 0-3. HTTP-only 설정 적용 (ACME 챌린지용)
echo "📌 HTTP 전용 Nginx 설정 적용 중 (ACME 챌린지용)..."
mkdir -p "$WEBROOT_PATH"
chmod 755 "$WEBROOT_PATH"

HTTP_ONLY_CONF="${MAIN_EC2_DIR}/nginx/nginx-http-only.conf"
if [ -f "$HTTP_ONLY_CONF" ]; then
    cp "$HTTP_ONLY_CONF" /etc/nginx/sites-available/default
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        echo -e "${GREEN}✅ HTTP 전용 설정 적용 완료${NC}"
    else
        echo -e "${YELLOW}⚠️ Nginx 설정 경고 (계속 진행)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ nginx-http-only.conf 없음 (건너뜀)${NC}"
fi
#############################################
# 1. Docker 및 Certbot 디렉토리 확인
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🔍 Step 1: 필수 도구 확인${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 설치 확인${NC}"

mkdir -p "$CERTBOT_PATH"
echo -e "${GREEN}✅ Certbot 디렉토리 준비 완료${NC}"
echo ""

#############################################
# 2. Frontend SSL 인증서 발급
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🌐 Step 2: Frontend SSL 인증서 발급${NC}"
echo -e "${BLUE}   도메인: $DOMAINS_FRONTEND${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ -d "$CERTBOT_PATH/live/zzik.kr" ]; then
    echo -e "${YELLOW}⚠️ zzik.kr 인증서가 이미 존재합니다. 갱신을 원하면 renew-ssl.sh를 사용하세요.${NC}"
else
    docker run --rm \
        -v $CERTBOT_PATH:/etc/letsencrypt \
        -v /var/lib/letsencrypt:/var/lib/letsencrypt \
        -v $WEBROOT_PATH:/var/www/certbot \
        certbot/certbot:latest \
        certonly --webroot \
        -w /var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        $(for domain in $DOMAINS_FRONTEND; do echo "-d $domain "; done) \
        --non-interactive

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend SSL 인증서 발급 완료!${NC}"
    else
        echo -e "${RED}❌ Frontend SSL 인증서 발급 실패!${NC}"
        exit 1
    fi
fi

#############################################
# 3. Backend SSL 인증서 발급
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🌐 Step 3: Backend SSL 인증서 발급${NC}"
echo -e "${BLUE}   도메인: $DOMAINS_BACKEND${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ -d "$CERTBOT_PATH/live/api.zzik.kr" ]; then
    echo -e "${YELLOW}⚠️ api.zzik.kr 인증서가 이미 존재합니다. 갱신을 원하면 renew-ssl.sh를 사용하세요.${NC}"
else
    docker run --rm \
        -v $CERTBOT_PATH:/etc/letsencrypt \
        -v /var/lib/letsencrypt:/var/lib/letsencrypt \
        -v $WEBROOT_PATH:/var/www/certbot \
        certbot/certbot:latest \
        certonly --webroot \
        -w /var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAINS_BACKEND \
        --non-interactive

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend SSL 인증서 발급 완료!${NC}"
    else
        echo -e "${RED}❌ Backend SSL 인증서 발급 실패!${NC}"
        exit 1
    fi
fi

#############################################
# 4. Jenkins SSL 인증서 발급
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🌐 Step 4: Jenkins SSL 인증서 발급${NC}"
echo -e "${BLUE}   도메인: $DOMAINS_JENKINS${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ -d "$CERTBOT_PATH/live/jenkins.zzik.kr" ]; then
    echo -e "${YELLOW}⚠️ jenkins.zzik.kr 인증서가 이미 존재합니다. 갱신을 원하면 renew-ssl.sh를 사용하세요.${NC}"
else
    docker run --rm \
        -v $CERTBOT_PATH:/etc/letsencrypt \
        -v /var/lib/letsencrypt:/var/lib/letsencrypt \
        -v $WEBROOT_PATH:/var/www/certbot \
        certbot/certbot:latest \
        certonly --webroot \
        -w /var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAINS_JENKINS \
        --non-interactive

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Jenkins SSL 인증서 발급 완료!${NC}"
    else
        echo -e "${RED}❌ Jenkins SSL 인증서 발급 실패!${NC}"
        exit 1
    fi
fi

#############################################
# 5. Grafana SSL 인증서 발급 (선택사항)
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🌐 Step 5: Grafana SSL 인증서 발급 (선택)${NC}"
echo -e "${BLUE}   도메인: $DOMAINS_GRAFANA${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ -d "$CERTBOT_PATH/live/monitoring.zzik.kr" ]; then
    echo -e "${YELLOW}⚠️ grafana.zzik.kr 인증서가 이미 존재합니다. 갱신을 원하면 renew-ssl.sh를 사용하세요.${NC}"
else
    docker run --rm \
        -v $CERTBOT_PATH:/etc/letsencrypt \
        -v /var/lib/letsencrypt:/var/lib/letsencrypt \
        -v $WEBROOT_PATH:/var/www/certbot \
        certbot/certbot:latest \
        certonly --webroot \
        -w /var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAINS_GRAFANA \
        --non-interactive

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Grafana SSL 인증서 발급 완료!${NC}"
    else
        echo -e "${YELLOW}⚠️ Grafana SSL 인증서 발급 실패 (DNS 없음, 건너뜀)${NC}"
    fi
fi

#############################################
# 6. 인증서 발급 확인
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}📋 Step 6: SSL 인증서 확인${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

CERT_FRONTEND="$CERTBOT_PATH/live/zzik.kr/fullchain.pem"
CERT_BACKEND="$CERTBOT_PATH/live/api.zzik.kr/fullchain.pem"
CERT_JENKINS="$CERTBOT_PATH/live/jenkins.zzik.kr/fullchain.pem"

if [ -f "$CERT_FRONTEND" ]; then
    echo -e "${GREEN}✅ Frontend 인증서 존재: zzik.kr${NC}"
else
    echo -e "${RED}❌ Frontend 인증서 없음${NC}"
fi

if [ -f "$CERT_BACKEND" ]; then
    echo -e "${GREEN}✅ Backend 인증서 존재: api.zzik.kr${NC}"
else
    echo -e "${RED}❌ Backend 인증서 없음${NC}"
fi

if [ -f "$CERT_JENKINS" ]; then
    echo -e "${GREEN}✅ Jenkins 인증서 존재: jenkins.zzik.kr${NC}"
else
    echo -e "${RED}❌ Jenkins 인증서 없음${NC}"
fi
echo ""

#############################################
# 7. HTTPS Nginx 설정 활성화 (현재 실행 중인 컨테이너 확인)
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}🔧 Step 7: HTTPS Nginx 설정 활성화${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# 현재 실행 중인 컨테이너 확인
FRONTEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'zzikgoga-frontend' || echo "")
BACKEND_CONTAINER=$(docker ps --format '{{.Names}}' | grep '^zzikgoga-' | grep -v frontend || echo "")

echo "📌 현재 실행 중인 컨테이너:"
if [ -n "$FRONTEND_CONTAINER" ]; then
    echo "   - Frontend: $FRONTEND_CONTAINER"
else
    echo "   - Frontend: 없음"
fi

if [ -n "$BACKEND_CONTAINER" ]; then
    echo "   - Backend: $BACKEND_CONTAINER"
else
    echo "   - Backend: 없음"
fi
echo ""

# Frontend HTTPS 설정 적용
if [ -n "$FRONTEND_CONTAINER" ] && [ -f "$CERT_FRONTEND" ]; then
    if [[ "$FRONTEND_CONTAINER" == *"-blue"* ]]; then
        FRONTEND_ENV="blue"
    else
        FRONTEND_ENV="green"
    fi

    echo "📌 Frontend HTTPS 설정 적용 중 (${FRONTEND_ENV})..."
    cp "${MAIN_EC2_DIR}/nginx/frontend-${FRONTEND_ENV}.conf" /etc/nginx/sites-available/zzik.kr
    ln -sf /etc/nginx/sites-available/zzik.kr /etc/nginx/sites-enabled/zzik.kr
    echo -e "${GREEN}✅ Frontend HTTPS 설정 적용 완료${NC}"
fi

# Backend HTTPS 설정 적용
if [ -n "$BACKEND_CONTAINER" ] && [ -f "$CERT_BACKEND" ]; then
    if [[ "$BACKEND_CONTAINER" == *"-blue" ]]; then
        BACKEND_ENV="blue"
    else
        BACKEND_ENV="green"
    fi

    echo "📌 Backend HTTPS 설정 적용 중 (${BACKEND_ENV})..."
    cp "${MAIN_EC2_DIR}/nginx/backend-${BACKEND_ENV}.conf" /etc/nginx/sites-available/api.zzik.kr
    ln -sf /etc/nginx/sites-available/api.zzik.kr /etc/nginx/sites-enabled/api.zzik.kr
    echo -e "${GREEN}✅ Backend HTTPS 설정 적용 완료${NC}"
fi

# HTTP 전용 설정 제거 (HTTPS로 전환)
if [ -f "$CERT_FRONTEND" ] || [ -f "$CERT_BACKEND" ]; then
    echo "📌 HTTP 전용 설정 제거 중..."
    rm -f /etc/nginx/sites-enabled/default
fi

# Nginx 설정 테스트 및 리로드
echo "📌 Nginx 설정 테스트 및 리로드 중..."
if nginx -t; then
    systemctl reload nginx
    echo -e "${GREEN}✅ Nginx HTTPS 설정 적용 및 리로드 완료${NC}"
else
    echo -e "${RED}❌ Nginx 설정 테스트 실패${NC}"
    nginx -t
fi
echo ""

#############################################
# 8. SSL 자동 갱신 Cron 설정
#############################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}⏰ Step 8: SSL 자동 갱신 Cron 설정${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

RENEW_SSL_SCRIPT="${SCRIPT_DIR}/renew-ssl.sh"
if [ -f "$RENEW_SSL_SCRIPT" ]; then
    chmod +x "$RENEW_SSL_SCRIPT"
    CRON_JOB="0 3 * * * ${RENEW_SSL_SCRIPT} >> /var/log/certbot-renew.log 2>&1"

    if crontab -l 2>/dev/null | grep -q "$RENEW_SSL_SCRIPT"; then
        echo -e "${YELLOW}⚠️ SSL 갱신 Cron job이 이미 존재합니다.${NC}"
    else
        (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
        echo -e "${GREEN}✅ SSL 자동 갱신 Cron job 추가 완료 (매일 새벽 3시)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ renew-ssl.sh 없음 (건너뜀)${NC}"
fi
echo ""

#############################################
# 최종 결과 출력
#############################################
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}🎉 Docker Certbot SSL/HTTPS 설정 완료!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

echo "📋 최종 상태:"
echo ""
echo "🔐 발급된 SSL 인증서:"
ls -la $CERTBOT_PATH/live/ 2>/dev/null | grep -E "zzik|api|jenkins" | awk '{print "   - " $9}' || echo "   없음"
echo ""

echo "🌐 Nginx 활성화된 사이트:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null | grep -v "^total" | grep -v "^d" | awk '{print "   - " $9 " -> " $11}'
echo ""

echo "🐳 실행 중인 컨테이너:"
docker ps --format "   - {{.Names}}: {{.Status}} ({{.Ports}})" | grep zzikgoga || echo "   없음"
echo ""

echo -e "${YELLOW}📌 다음 단계:${NC}"
echo "   1. DNS 확인: zzik.kr, api.zzik.kr, jenkins.zzik.kr → EC2 공인 IP"
echo "   2. HTTPS 테스트:"
echo "      - https://zzik.kr (Frontend)"
echo "      - https://api.zzik.kr (Backend)"
echo "      - https://jenkins.zzik.kr (Jenkins)"
echo "   3. Jenkins에서 재배포:"
echo "      - fe/master 푸시 → Frontend 자동 배포 (HTTPS)"
echo "      - be/master 푸시 → Backend 자동 배포 (HTTPS)"
echo ""
echo "⏰ 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"
