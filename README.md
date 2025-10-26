# Zzikgoga CI/CD Infrastructure

Jenkins + GitLab + Nginx + Docker를 이용한 Blue-Green 무중단 배포 인프라 설정

## 프로젝트 구조

```
S13P31A102/
├── jenkins/                     # Jenkins 파이프라인
│   ├── ci-build.groovy         # 통합 CI (Frontend/Backend)
│   ├── cd-deploy.groovy        # 통합 CD (Frontend/Backend)
│   ├── ci-docker-build.groovy  # (레거시) 백엔드 CI
│   └── blue-green-deploy.groovy # (레거시) 백엔드 CD
├── scripts/                     # 배포 스크립트
│   ├── deploy.sh               # Blue-Green 배포
│   └── setup-ssl.sh            # SSL 설정 (Docker certbot)
├── docker/                      # Docker 관련 설정
│   ├── nginx/
│   │   └── zzik.kr.conf        # Nginx HTTPS 설정
│   └── .env.example            # 환경변수 템플릿
├── EC2-SETUP.md                # EC2 배포 상세 가이드
├── .gitignore
└── README.md
```

## 브랜치 전략

- **infra/master**: 인프라 설정 (이 저장소)
- **fe/master**: React + Vite 프론트엔드
- **be/master**: Spring Boot 백엔드

## 배포 아키텍처

### 옵션 1: Jenkins를 EC2 내부에 설치 (권장)

```
EC2 인스턴스 (t3.medium)
├── Jenkins (포트 8080)
│   ├── CI Pipeline (빌드)
│   └── CD Pipeline (배포)
├── Nginx (포트 80/443)
│   └── https://zzik.kr
└── 애플리케이션
    ├── Frontend: /var/www/zzikgoga
    └── Backend: /opt/zzikgoga/backend
```

### 옵션 2: 외부 Jenkins에서 SSH 배포

```
외부 Jenkins 서버
  → SSH 연결 →
      EC2 인스턴스
      ├── Nginx (포트 80/443)
      └── 애플리케이션
```

**상세 설정**: `EC2-SETUP.md` 참고

## 빠른 시작

### 1. EC2 인스턴스 준비

```bash
# Ubuntu 22.04 LTS
# 최소 t3.small, 권장 t3.medium
# 보안 그룹: 22(SSH), 80(HTTP), 443(HTTPS), 8080(Jenkins)

# SSH 접속
ssh -i your-key.pem ubuntu@<EC2-IP>

# 기본 설정
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y git curl wget nginx
```

### 2. Jenkins 설치 (EC2 내부 방식)

```bash
# Java 설치
sudo apt-get install -y openjdk-17-jdk

# Jenkins 설치
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt-get update
sudo apt-get install -y jenkins

# Jenkins 시작
sudo systemctl start jenkins
sudo systemctl enable jenkins

# 초기 비밀번호
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

**Jenkins 접속**: `http://<EC2-IP>:8080`

### 3. Node.js 설치 (Frontend 빌드용)

```bash
# NodeSource 저장소
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# 설치
sudo apt-get install -y nodejs
node --version  # v20.x
```

### 4. Docker 설치 (SSL certbot용)

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### 5. SSL 인증서 설정

```bash
# infra 저장소 클론
git clone -b infra/master <your-infra-repo> /tmp/infra
cd /tmp/infra

# 이메일 수정
nano scripts/setup-ssl.sh  # EMAIL 변수 변경

# 실행
chmod +x scripts/setup-ssl.sh
./scripts/setup-ssl.sh
```

### 6. 디렉토리 생성

```bash
# Frontend
sudo mkdir -p /var/www/zzikgoga
sudo chown -R $USER:$USER /var/www/zzikgoga

# 배포 작업 디렉토리
sudo mkdir -p /opt/zzikgoga/frontend /opt/zzikgoga/backend
sudo chown -R $USER:$USER /opt/zzikgoga
```

### 7. Jenkins Job 생성

#### CI Job: zzikgoga-ci

```
Type: Pipeline
Pipeline script from SCM:
  Repository: <fe 또는 be 저장소 URL>
  Branch: */fe/master 또는 */be/master
  Script Path: jenkins/ci-build.groovy

빌드 트리거:
  - GitLab webhook
  - Poll SCM: H/5 * * * * (5분마다)

Parameters:
  PROJECT_TYPE: frontend (또는 backend)
  BRANCH_NAME: fe/master (또는 be/master)
```

**주의**: `jenkins/ci-build.groovy`를 fe/be 저장소에 복사해야 합니다.

```bash
# fe/master 브랜치에
mkdir -p jenkins
cp /tmp/infra/jenkins/ci-build.groovy jenkins/

# be/master 브랜치에도 동일
```

#### CD Job: zzikgoga-deploy

```
Type: Pipeline
Pipeline script from SCM:
  Repository: <infra 저장소 URL>
  Branch: */infra/master
  Script Path: jenkins/cd-deploy.groovy

Parameters:
  PROJECT_TYPE: frontend (또는 backend)
  DEPLOY_MODE: local (EC2 내부) 또는 remote-ssh (외부 Jenkins)
  DOMAIN: zzik.kr
```

### 8. Jenkins Credentials 등록

```
Manage Jenkins → Credentials → System → Global

1. fe-prod-env-file
   Kind: Secret file
   File: 프로덕션 .env 파일

2. ec2-ssh-key (SSH 모드만)
   Kind: SSH Username with private key
   Username: ubuntu
   Private Key: EC2 SSH 키
```

### 9. GitLab Webhook 설정

```
GitLab 프로젝트 → Settings → Webhooks

URL: http://<EC2-IP>:8080/project/zzikgoga-ci
Secret Token: (Jenkins에서 생성)
Trigger events: Push events
Branch filter: fe/master (또는 be/master)
```

## 배포 플로우

### CI Pipeline (ci-build.groovy)

**트리거**: fe/master 또는 be/master에 push

```
1. 환경 설정 (Node.js 또는 Java)
2. 의존성 설치
   - Frontend: npm ci
   - Backend: ./gradlew
3. 빌드
   - Frontend: npm run build → dist/
   - Backend: ./gradlew build → build/libs/
4. 공유 디렉토리 복사
   → /tmp/shared-workspace/zzikgoga-frontend/
   → /tmp/shared-workspace/zzikgoga-backend/
5. 테스트 실행
```

### CD Pipeline (cd-deploy.groovy)

**트리거**: CI 성공 후 수동/자동

```
1. 아티팩트 복사
   공유 디렉토리 → /opt/zzikgoga/frontend/ (또는 backend/)

2. 환경변수 로드 (Frontend만)
   Jenkins Credentials → .env

3. 배포 스크립트 실행
   - infra 저장소에서 scripts/deploy.sh 가져오기
   - Blue-Green 배포 실행
   - 심볼릭 링크 전환

4. 헬스 체크
   - Frontend: https://zzik.kr/health
   - Backend: http://localhost:8080/actuator/health

5. 검증
```

## Blue-Green 배포

### Frontend 디렉토리 구조

```
/var/www/zzikgoga/
├── blue/
│   ├── index.html
│   ├── assets/
│   └── env-config.js
├── green/
│   ├── index.html
│   ├── assets/
│   └── env-config.js
├── current → blue/  # 심볼릭 링크
└── .active-env      # "blue" 또는 "green"
```

### 배포 프로세스

1. 현재 활성 환경 확인 (`.active-env`)
2. 대기 환경 결정 (blue ↔ green)
3. dist 파일 복사 + 환경변수 주입
4. 심볼릭 링크 전환 (무중단)
5. Nginx 리로드
6. 이전 환경 유지 (롤백 대비)

## 환경변수 관리

### fe/master 브랜치에 추가

```bash
# infra 저장소에서 복사
cp docker/.env.example <fe-repo>/.env.example
cp docker/.gitignore <fe-repo>/.gitignore

# 프로덕션 .env 생성
cd <fe-repo>
cp .env.example .env
# 값 수정
```

**`.env` 예시:**
```env
VITE_APP_ENV=production
VITE_API_URL=https://zzik.kr/api
VITE_DOMAIN=zzik.kr
```

### 런타임 환경변수 주입

`scripts/deploy.sh`가 자동으로 `env-config.js` 생성:

```javascript
window.ENV = {
  VITE_API_URL: "https://zzik.kr/api",
  VITE_APP_ENV: "production",
  VITE_DOMAIN: "zzik.kr"
};
```

**React에서 사용:**
```html
<!-- public/index.html -->
<script src="/env-config.js"></script>
```

```javascript
console.log(window.ENV.VITE_API_URL);
```

## 운영 가이드

### 배포 상태 확인

```bash
# 활성 환경
cat /var/www/zzikgoga/.active-env

# 심볼릭 링크
ls -lh /var/www/zzikgoga/current

# 배포 정보
cat /var/www/zzikgoga/current/deploy-info.txt

# Nginx 상태
sudo systemctl status nginx
```

### 수동 롤백

```bash
# 활성 환경 확인
ACTIVE=$(cat /var/www/zzikgoga/.active-env)

# 반대 환경으로
NEW_ENV=$([ "$ACTIVE" = "blue" ] && echo "green" || echo "blue")

# 전환
sudo rm -f /var/www/zzikgoga/current
sudo ln -s /var/www/zzikgoga/$NEW_ENV /var/www/zzikgoga/current
echo $NEW_ENV > /var/www/zzikgoga/.active-env
sudo systemctl reload nginx
```

### SSL 인증서 관리

```bash
# 인증서 정보
sudo docker run --rm \
  -v "/opt/certbot/conf:/etc/letsencrypt" \
  certbot/certbot certificates

# 수동 갱신
sudo /opt/certbot/renew.sh

# 갱신 테스트
sudo docker run --rm \
  -v "/opt/certbot/conf:/etc/letsencrypt" \
  -v "/var/www/certbot:/var/www/certbot" \
  certbot/certbot renew --dry-run
```

### 로그 모니터링

```bash
# Nginx
sudo tail -f /var/log/nginx/zzik.kr.access.log
sudo tail -f /var/log/nginx/zzik.kr.error.log

# Jenkins
sudo tail -f /var/log/jenkins/jenkins.log

# 애플리케이션 (Backend)
sudo journalctl -u zzikgoga-backend -f
```

## 문제 해결

### Jenkins 빌드 실패

```bash
# Jenkins 로그
sudo tail -f /var/log/jenkins/jenkins.log

# 작업 공간 확인
ls -lah /tmp/shared-workspace/

# 권한 확인
sudo chown -R jenkins:jenkins /tmp/shared-workspace/
```

### SSL 인증서 발급 실패

```bash
# DNS 확인
nslookup zzik.kr
dig zzik.kr

# 포트 열기
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# certbot 로그
sudo tail -f /var/log/certbot-renew.log
```

### SSH 배포 실패 (외부 Jenkins)

```bash
# SSH 연결 테스트
ssh -i jenkins-key ubuntu@<EC2-IP>

# known_hosts 초기화
ssh-keygen -R <EC2-IP>

# Jenkins Credentials 재등록
```

## 보안

### Jenkins 보안

```bash
# 초기 설정 후 8080 포트 차단
sudo ufw deny 8080

# 또는 Nginx 리버스 프록시 + Basic Auth 사용
```

### 파일 권한

```bash
sudo chown -R www-data:www-data /var/www/zzikgoga
sudo chmod -R 755 /var/www/zzikgoga
```

### 환경변수

- `.env` 파일은 Git에 커밋 금지
- Jenkins Credentials로 안전하게 관리
- 배포 후 자동 삭제

## 성능 최적화

- **정적 파일**: 1년 캐싱
- **HTML**: 캐시 비활성화
- **Gzip**: 텍스트 압축
- **HTTP/2**: 성능 향상
- **무중단 배포**: 다운타임 0초

## 참고

### 디렉토리

- Jenkins 공유: `/tmp/shared-workspace/`
- 배포 작업: `/opt/zzikgoga/`
- 웹 루트: `/var/www/zzikgoga/`
- Nginx 설정: `/etc/nginx/sites-available/zzik.kr`
- SSL 인증서: `/etc/letsencrypt/` (→ `/opt/certbot/conf/`)

### 포트

- Nginx HTTP: 80
- Nginx HTTPS: 443
- Jenkins: 8080
- Backend: 8080 (내부)

### 도메인

- Frontend: `https://zzik.kr`
- API: `https://zzik.kr/api` (Nginx 프록시)

## 추가 문서

- **EC2-SETUP.md**: EC2 인스턴스 상세 설정 가이드
  - Jenkins 설치 방법
  - SSH 배포 설정
  - 보안 권장사항
  - 비용 최적화
  - 모니터링 및 백업
