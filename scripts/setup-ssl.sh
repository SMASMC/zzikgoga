#!/bin/bash

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="zzik.kr"
EMAIL="your-email@example.com"  # 변경 필요
CERTBOT_DIR="/opt/certbot"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  SSL Certificate Setup (Docker + certbot)${NC}"
echo -e "${BLUE}========================================${NC}"

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed!${NC}"
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo -e "${GREEN}Docker installed. Please logout and login again, then re-run this script${NC}"
    exit 0
fi

# Nginx 설치 확인
if ! command -v nginx &> /dev/null; then
    echo -e "${RED}Nginx is not installed!${NC}"
    exit 1
fi

# certbot 디렉토리 생성
sudo mkdir -p ${CERTBOT_DIR}/conf
sudo mkdir -p ${CERTBOT_DIR}/www
sudo mkdir -p /var/www/certbot

echo -e "${YELLOW}Setting up temporary HTTP configuration...${NC}"

# 임시 HTTP 설정 (SSL 발급 전)
sudo tee /etc/nginx/sites-available/zzik.kr-temp > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /var/www/zzikgoga/current;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# 임시 설정 활성화
sudo rm -f /etc/nginx/sites-enabled/zzik.kr
sudo ln -s /etc/nginx/sites-available/zzik.kr-temp /etc/nginx/sites-enabled/zzik.kr-temp

# Nginx 테스트 및 리로드
sudo nginx -t && sudo systemctl reload nginx

# SSL 인증서 발급 (Docker certbot)
echo -e "${YELLOW}Obtaining SSL certificate using Docker certbot...${NC}"
echo -e "${YELLOW}Email: ${EMAIL}${NC}"
echo -e "${YELLOW}Domain: ${DOMAIN}, www.${DOMAIN}${NC}"

sudo docker run -it --rm \
    -v "${CERTBOT_DIR}/conf:/etc/letsencrypt" \
    -v "${CERTBOT_DIR}/www:/var/www/certbot" \
    -v "/var/www/certbot:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    --force-renewal

if [ $? -eq 0 ]; then
    echo -e "${GREEN}SSL certificate obtained successfully!${NC}"
else
    echo -e "${RED}Failed to obtain SSL certificate${NC}"
    exit 1
fi

# 인증서를 시스템 위치로 심볼릭 링크
sudo mkdir -p /etc/letsencrypt
sudo rm -rf /etc/letsencrypt/live /etc/letsencrypt/archive /etc/letsencrypt/renewal
sudo ln -s ${CERTBOT_DIR}/conf/live /etc/letsencrypt/live
sudo ln -s ${CERTBOT_DIR}/conf/archive /etc/letsencrypt/archive
sudo ln -s ${CERTBOT_DIR}/conf/renewal /etc/letsencrypt/renewal

# 임시 설정 제거
sudo rm -f /etc/nginx/sites-enabled/zzik.kr-temp

# 최종 HTTPS 설정 복사 및 활성화
echo -e "${YELLOW}Activating HTTPS configuration...${NC}"
sudo cp nginx/zzik.kr.conf /etc/nginx/sites-available/zzik.kr
sudo ln -sf /etc/nginx/sites-available/zzik.kr /etc/nginx/sites-enabled/zzik.kr

# Nginx 테스트 및 재시작
sudo nginx -t && sudo systemctl reload nginx

# 자동 갱신 설정 (cron)
echo -e "${YELLOW}Setting up automatic renewal (cron)...${NC}"

# 갱신 스크립트 생성
sudo tee ${CERTBOT_DIR}/renew.sh > /dev/null <<'SCRIPT'
#!/bin/bash

docker run --rm \
    -v "/opt/certbot/conf:/etc/letsencrypt" \
    -v "/opt/certbot/www:/var/www/certbot" \
    -v "/var/www/certbot:/var/www/certbot" \
    certbot/certbot renew \
    --webroot \
    --webroot-path=/var/www/certbot

# Nginx 리로드
if [ $? -eq 0 ]; then
    systemctl reload nginx
fi
SCRIPT

sudo chmod +x ${CERTBOT_DIR}/renew.sh

# crontab 설정 (매일 자정에 갱신 확인)
CRON_JOB="0 0 * * * ${CERTBOT_DIR}/renew.sh >> /var/log/certbot-renew.log 2>&1"
(sudo crontab -l 2>/dev/null | grep -v "certbot"; echo "$CRON_JOB") | sudo crontab -

echo -e "${GREEN}Automatic renewal configured via cron${NC}"

# 수동 갱신 테스트
echo -e "${YELLOW}Testing certificate renewal...${NC}"
sudo docker run --rm \
    -v "${CERTBOT_DIR}/conf:/etc/letsencrypt" \
    -v "${CERTBOT_DIR}/www:/var/www/certbot" \
    -v "/var/www/certbot:/var/www/certbot" \
    certbot/certbot renew --dry-run

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Renewal test successful!${NC}"
else
    echo -e "${YELLOW}Warning: Renewal test failed${NC}"
fi

# 완료
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SSL Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Certificate: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem${NC}"
echo -e "${GREEN}Private Key: /etc/letsencrypt/live/${DOMAIN}/privkey.pem${NC}"
echo -e "${GREEN}Expiry: ~90 days (auto-renewal via cron)${NC}"
echo -e "${GREEN}Renewal script: ${CERTBOT_DIR}/renew.sh${NC}"
echo -e "${GREEN}========================================${NC}"

# 인증서 정보 표시
sudo docker run --rm \
    -v "${CERTBOT_DIR}/conf:/etc/letsencrypt" \
    certbot/certbot certificates

echo -e "\n${BLUE}HTTPS is now enabled for https://${DOMAIN}${NC}"
echo -e "${YELLOW}Don't forget to update the EMAIL variable in this script!${NC}"
echo -e "${YELLOW}Manual renewal: sudo ${CERTBOT_DIR}/renew.sh${NC}"
