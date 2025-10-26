# Zzikgoga CI/CD Infrastructure

Jenkins + GitLab + Nginx + Docker를 이용한 Blue-Green 무중단 배포 인프라 설정

## 프로젝트 구조

```
S13P31A102/                      # infra/master 브랜치
├── jenkins/                     # Jenkins 파이프라인 (중앙 관리)
│   ├── ci-build.groovy         # ⭐ 통합 CI (Frontend/Backend)
│   ├── cd-deploy.groovy        # ⭐ 통합 CD (Frontend/Backend)
│   ├── ci-pipeline-shared.groovy  # (레거시) 백엔드 CI
│   ├── ci-docker-build.groovy     # (레거시) 백엔드 Docker 빌드
│   └── blue-green-deploy.groovy   # (레거시) 백엔드 CD
├── scripts/                     # 배포 스크립트
│   ├── deploy.sh               # Blue-Green 배포 (Frontend/Backend 지원)
│   └── setup-ssl.sh            # SSL 설정 (Docker certbot)
├── docker/                      # Docker 관련 설정
│   ├── docker-compose-blue.yml    # Blue 환경 (Frontend)
│   ├── docker-compose-green.yml   # Green 환경 (Frontend)
│   ├── docker-compose.common.yml  # 공통 (Database)
│   └── .env.example            # 환경변수 템플릿
├── nginx/                       # Nginx 설정
│   ├── zzik.kr.conf            # Frontend HTTPS
│   ├── nginx-blue.conf         # Backend API Blue
│   └── nginx-green.conf        # Backend API Green
├── dockerfile                   # Frontend Dockerfile (Vite + Nginx)
├── EC2-SETUP.md                # EC2 배포 상세 가이드
├── .gitignore
└── README.md
```

**중요**: infra/master에서 모든 인프라 설정을 중앙 관리합니다.
- fe/master: React 소스 코드만 (package.json, src/)
- be/master: Spring Boot 소스만 (build.gradle, src/)
- infra/master: 모든 배포 설정 (이 저장소)

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

**중요**: 모든 파이프라인은 **infra/master**에서 가져옵니다. fe/be 저장소에 파일 복사 불필요!

#### CI Job: zzikgoga-frontend-ci

```
New Item → Pipeline
Name: zzikgoga-frontend-ci

Type: Pipeline
Pipeline script from SCM:
  SCM: Git
  Repository URL: <infra 저장소 URL>  ⭐ infra 저장소!
  Branch: */infra/master
  Script Path: jenkins/ci-build.groovy

Parameters (자동 추가됨):
  - PROJECT_TYPE: frontend
  - BRANCH_NAME: fe/master
  - REPO_URL: <fe 저장소 URL>
  - SHARED_WORKSPACE: /tmp/shared-workspace

빌드 트리거:
  ✓ GitLab webhook (선택사항)
  ✓ Poll SCM: H/5 * * * * (5분마다)
```

#### CI Job: zzikgoga-backend-ci (백엔드용)

```
Name: zzikgoga-backend-ci

Pipeline script from SCM:
  Repository URL: <infra 저장소 URL>  ⭐ 동일!
  Branch: */infra/master
  Script Path: jenkins/ci-build.groovy

Parameters:
  - PROJECT_TYPE: backend
  - BRANCH_NAME: be/master
  - REPO_URL: <be 저장소 URL>
```

#### CD Job: zzikgoga-frontend-cd

```
Name: zzikgoga-frontend-cd

Type: Pipeline
Pipeline script from SCM:
  Repository URL: <infra 저장소 URL>
  Branch: */infra/master
  Script Path: jenkins/cd-deploy.groovy

Parameters:
  - PROJECT_TYPE: frontend
  - DEPLOY_MODE: local (또는 remote-ssh)
  - SSH_HOST: (remote-ssh 모드에서만)
```

#### CD Job: zzikgoga-backend-cd (백엔드용)

```
Name: zzikgoga-backend-cd

Parameters:
  - PROJECT_TYPE: backend
  - DEPLOY_MODE: local
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

**저장소**: infra/master의 jenkins/ci-build.groovy
**소스 체크아웃**: 파이프라인 내부에서 fe/master 또는 be/master를 체크아웃

```
1. Checkout Source (infra 파이프라인이 fe/be 저장소 체크아웃)
   - Frontend: fe/master 체크아웃
   - Backend: be/master 체크아웃

2. 환경 설정
   - Frontend: Node.js 확인
   - Backend: Java 21 설정

3. 의존성 설치
   - Frontend: npm ci
   - Backend: Gradle (빌드 시 자동)

4. 빌드
   - Frontend: npm run build → dist/
   - Backend: ./gradlew clean build → build/libs/

5. 공유 디렉토리 복사
   → /tmp/shared-workspace/zzikgoga-frontend/
   → /tmp/shared-workspace/zzikgoga-backend/

6. 테스트 실행 (Backend만)
```

### CD Pipeline (cd-deploy.groovy)

**저장소**: infra/master의 jenkins/cd-deploy.groovy
**트리거**: CI 성공 후 수동/자동

```
1. 아티팩트 검증
   공유 디렉토리에 빌드 결과물 확인

2. 환경변수 준비 (Frontend만)
   Jenkins Credentials → docker/.env

3. 배포 디렉토리 준비
   /opt/zzikgoga/frontend/ (또는 backend/)

4. 파일 복사
   - 빌드 결과물: 공유 디렉토리 → 배포 디렉토리
   - 인프라 설정: infra/master → 배포 디렉토리
     (dockerfile, docker/, nginx/, scripts/)

5. Docker 이미지 빌드
   docker build -t zzikgoga-frontend:latest .

6. Blue-Green 배포 실행
   PROJECT_TYPE=frontend ./scripts/deploy.sh

7. 헬스 체크
   - Frontend: http://localhost:3001/health (또는 3002)
   - Backend: http://localhost:8081/health-check (또는 8082)
```

## Blue-Green 배포

### Frontend Docker 컨테이너 구조

```
Docker Containers:
├── zzikgoga-frontend-blue (포트 3001)
│   └── Nginx + React 빌드 파일
└── zzikgoga-frontend-green (포트 3002)
    └── Nginx + React 빌드 파일

Nginx Proxy:
  활성 컨테이너로 트래픽 전환
```

### Backend Docker 컨테이너 구조

```
Docker Containers:
├── zzikgoga-blue (포트 8081)
│   └── Spring Boot + DB 연결
└── zzikgoga-green (포트 8082)
    └── Spring Boot + DB 연결

Shared:
└── db (PostgreSQL 16)
```

### 배포 프로세스

1. 현재 활성 환경 확인 (docker ps로 실행 중인 컨테이너 확인)
2. 대기 환경 결정 (blue ↔ green)
3. 새 Docker 이미지로 대기 환경 컨테이너 시작
4. 헬스 체크 (최대 40회 시도, 5초 간격)
5. Nginx 설정 전환 (nginx-blue.conf ↔ nginx-green.conf)
6. 이전 환경 컨테이너 중지 및 제거
7. 롤백 대비 이미지는 유지 (zzikgoga-frontend:latest-previous)

## 환경변수 관리

### Docker 환경변수 (infra/master에서 관리)

**docker/.env.example** 템플릿:
```env
# Database Configuration (for backend)
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

# Frontend Environment Variables
VITE_APP_ENV=
VITE_API_URL=
VITE_DOMAIN=
```

**프로덕션 .env 생성:**
```bash
cd infra/master
cp docker/.env.example docker/.env

# 값 수정
vim docker/.env
```

**프로덕션 예시 (docker/.env):**
```env
# Database
POSTGRES_DB=postgres
POSTGRES_USER=zzik325325
POSTGRES_PASSWORD=your_secure_password

# Frontend
VITE_APP_ENV=production
VITE_API_URL=https://api.zzik.kr
VITE_DOMAIN=zzik.kr
```

### Jenkins Credentials 등록

Jenkins에서 `.env` 파일을 Secret File로 관리:

```
Manage Jenkins → Credentials → Global

1. fe-prod-env-file
   Kind: Secret file
   File: docker/.env (업로드)
   Description: Frontend production environment
```

### 환경변수 주입 방식

**Frontend (Docker 컨테이너)**:
- Jenkins가 Credentials에서 .env 가져옴
- docker-compose가 .env 로드
- 컨테이너 내부에서 환경변수 사용 가능

**React에서 사용:**
```javascript
// Vite가 빌드 시 자동 주입
console.log(import.meta.env.VITE_API_URL)
```

## 운영 가이드

### 배포 상태 확인

```bash
# 실행 중인 컨테이너 확인
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Frontend 컨테이너
docker ps | grep zzikgoga-frontend

# Backend 컨테이너
docker ps | grep zzikgoga

# 빌드 정보 확인
cat /tmp/shared-workspace/zzikgoga-frontend/build-info.txt

# Nginx 상태
sudo systemctl status nginx

# 활성 Nginx 설정 확인
ls -la /etc/nginx/sites-enabled/

# 컨테이너 로그
docker logs zzikgoga-frontend-blue --tail 50
docker logs zzikgoga-frontend-green --tail 50
```

### 수동 롤백

**Frontend:**
```bash
# 1. 현재 활성 컨테이너 확인
docker ps | grep zzikgoga-frontend

# 2. 이전 이미지로 새 컨테이너 시작
docker stop zzikgoga-frontend-blue  # 또는 green
docker run -d --name zzikgoga-frontend-blue \
  -p 3001:80 \
  --env-file /opt/zzikgoga/frontend/docker/.env \
  zzikgoga-frontend:latest-previous

# 3. 헬스 체크
curl http://localhost:3001/health

# 4. Nginx 설정 전환 (필요시)
sudo cp /opt/zzikgoga/frontend/nginx/nginx-blue.conf \
  /etc/nginx/sites-available/zzik.kr
sudo systemctl reload nginx
```

**또는 deploy.sh 재실행:**
```bash
cd /opt/zzikgoga/frontend

# 이전 이미지를 latest로 태그
docker tag zzikgoga-frontend:latest-previous zzikgoga-frontend:latest

# 배포 스크립트 실행
PROJECT_TYPE=frontend ./scripts/deploy.sh
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
