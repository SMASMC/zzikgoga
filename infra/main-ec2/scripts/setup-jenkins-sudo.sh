#!/usr/bin/env bash
# Jenkins 전용 sudo 권한을 한 번에 만들어 주는 helper
# Cloudflare를 이용하므로 Certbot/SSL 발급까지는 포함하지 않습니다.

set -euo pipefail

SUDOERS_FILE="/etc/sudoers.d/jenkins"
BINDIR="/usr/bin"
SYSTEMCTL="${BINDIR}/systemctl"
NGINX="/usr/sbin/nginx"
BACKEND_SCRIPT="${BACKEND_SCRIPT:-/var/lib/jenkins/workspace/be3-nginx-backend-deploy@2/infra/main-ec2/scripts/deploy-backend.sh}"
FRONTEND_SCRIPT="${FRONTEND_SCRIPT:-/var/lib/jenkins/workspace/fe1-nginx-zzik-frontend-ci-build/infra/main-ec2/scripts/deploy-frontend-static.sh}"

if [ "$(id -u)" -ne 0 ]; then
  echo "이 스크립트는 root로 실행되어야 합니다."
  echo "  sudo bash $0"
  exit 1
fi

cat <<EOF > "$SUDOERS_FILE"
Defaults:jenkins !requiretty
Defaults:jenkins secure_path="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
jenkins ALL=(ALL) NOPASSWD: ${BINDIR}/cp
jenkins ALL=(ALL) NOPASSWD: /bin/ln
jenkins ALL=(ALL) NOPASSWD: ${NGINX}
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} reload nginx
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} restart nginx
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} start nginx
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} stop nginx
jenkins ALL=(ALL) NOPASSWD: ${BACKEND_SCRIPT}
jenkins ALL=(ALL) NOPASSWD: ${FRONTEND_SCRIPT}
EOF

chmod 440 "$SUDOERS_FILE"
visudo -c -f "$SUDOERS_FILE"

echo "Jenkins sudoers 설정을 완료했습니다."
