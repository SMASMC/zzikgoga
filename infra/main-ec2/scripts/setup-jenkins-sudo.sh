#!/usr/bin/env bash
# Jenkins 전용 sudo 권한을 한 번에 만들어 주는 helper
# Cloudflare를 이용하므로 Certbot/SSL 발급까지는 포함하지 않습니다.

set -euo pipefail

SUDOERS_FILE="/etc/sudoers.d/jenkins"
BINDIR="/usr/bin"
SYSTEMCTL="${BINDIR}/systemctl"
NGINX="/usr/sbin/nginx"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_PREFIX="/usr/local/bin"
mkdir -p "${INSTALL_PREFIX}"

install -m 755 "${SCRIPT_DIR}/deploy-backend.sh" "${INSTALL_PREFIX}/deploy-backend.sh"
install -m 755 "${SCRIPT_DIR}/deploy-frontend-static.sh" "${INSTALL_PREFIX}/deploy-frontend-static.sh"

BACKEND_SCRIPT="${BACKEND_SCRIPT:-${INSTALL_PREFIX}/deploy-backend.sh}"
FRONTEND_SCRIPT="${FRONTEND_SCRIPT:-${INSTALL_PREFIX}/deploy-frontend-static.sh}"

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
jenkins ALL=(ALL) NOPASSWD: /bin/rm
jenkins ALL=(ALL) NOPASSWD: /bin/mv
jenkins ALL=(ALL) NOPASSWD: /bin/mkdir
jenkins ALL=(ALL) NOPASSWD: /bin/chown
jenkins ALL=(ALL) NOPASSWD: /bin/chmod
jenkins ALL=(ALL) NOPASSWD: ${NGINX}
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} reload nginx
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} restart nginx
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} start nginx
jenkins ALL=(ALL) NOPASSWD: ${SYSTEMCTL} stop nginx
jenkins ALL=(ALL) NOPASSWD: ${BACKEND_SCRIPT}
jenkins ALL=(ALL) NOPASSWD: ${FRONTEND_SCRIPT}
# Jenkins workspace에서 직접 실행하는 경우 (bash 스크립트)
jenkins ALL=(ALL) NOPASSWD: /bin/bash /var/lib/jenkins/workspace/*/workspace-infra/infra/main-ec2/scripts/deploy-frontend-static.sh *
jenkins ALL=(ALL) NOPASSWD: /usr/bin/bash /var/lib/jenkins/workspace/*/workspace-infra/infra/main-ec2/scripts/deploy-frontend-static.sh *
EOF

chmod 440 "$SUDOERS_FILE"
visudo -c -f "$SUDOERS_FILE"

echo "Jenkins sudoers 설정을 완료했습니다."
