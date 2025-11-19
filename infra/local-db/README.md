# 로컬 백엔드 개발 환경

백엔드 개발자들이 로컬 Windows 환경에서 PostgreSQL과 Redis를 Docker 컨테이너로 쉽게 띄울 수 있도록 구성된 환경입니다.

## 사전 요구사항

- **Docker Desktop for Windows** 설치 및 실행
- **Git Bash** 또는 **CMD** (배치 파일 실행용)

## 파일 구성

```
local-backend/
├── .env          # 환경 변수 설정 (로컬 개발용 기본값 포함)
├── start.bat     # 컨테이너 시작 스크립트
├── stop.bat      # 컨테이너 종료 스크립트
├── clean.bat     # 컨테이너 및 데이터 완전 삭제 스크립트
└── README.md     # 이 파일
```

## 사용 방법

### 1. 컨테이너 시작

1. `start.bat` 파일을 **더블클릭**하여 실행
2. PostgreSQL과 Redis 컨테이너가 자동으로 시작됩니다
3. 시작이 완료되면 다음 정보가 표시됩니다:

```
PostgreSQL: localhost:5432
  - Database: zzik
  - User: postgres
  - Password: postgres

Redis: localhost:6379
  - Password: zzik
```

### 2. Spring Boot 애플리케이션 실행

컨테이너가 실행된 후, Spring Boot 애플리케이션을 IDE(IntelliJ, VS Code 등)에서 실행합니다.

**중요:** Spring Boot는 `application-local.yml` 프로파일을 사용해야 합니다.

```yaml
# application-local.yml 설정 예시
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/zzik
    username: postgres
    password: postgres
  data.redis:
    host: host.docker.internal  # Windows Docker Desktop 사용 시
    port: 6379
    password: zzik
```

### 3. 컨테이너 종료

작업이 끝나면 `stop.bat` 파일을 **더블클릭**하여 컨테이너를 종료합니다.

**참고:** 컨테이너를 종료해도 데이터는 유지됩니다. 다시 `start.bat`을 실행하면 이전 데이터가 그대로 남아있습니다.

### 4. 데이터 완전 삭제 (선택 사항)

DB 데이터를 완전히 초기화하고 싶을 때는 `clean.bat` 파일을 **더블클릭**합니다.

⚠️ **경고:** 이 작업은 다음을 삭제합니다:
- PostgreSQL의 모든 데이터베이스 및 테이블
- Redis의 모든 캐시 데이터
- Docker 볼륨 (pgdata, redis-data)

실행 시 확인 메시지가 표시되며, 'Y'를 입력하면 삭제가 진행됩니다.

## 환경 변수 설정

`.env` 파일에는 로컬 개발용 기본값이 설정되어 있습니다. 필요 시 값을 수정할 수 있습니다.

```env
# PostgreSQL 설정
POSTGRES_DB=zzik
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432

# Redis 설정
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=zzik
REDIS_DB=redis
REDIS_DATABASE=0

# JWT 시크릿 키
JWT_ACCESS_SECRET=zzikAccessAccessAccessTokenSecretKeyForzzik
JWT_REFRESH_SECRET=zzikRefreshRefreshRefreshTokenSecretKeyForzzik

# Kakao OAuth
KAKAO_CLIENT_ID=d681737d278913da69c79651d2267263
KAKAO_REDIRECT_URI=http://localhost:8081/api/auth/callback
```

## 문제 해결

### Docker가 실행되지 않음

```
[ERROR] Docker가 실행되지 않았습니다.
```

**해결:** Docker Desktop을 실행한 후 다시 시도하세요.

### 포트 충돌

PostgreSQL(5432) 또는 Redis(6379) 포트가 이미 사용 중인 경우:

1. 기존 프로세스를 종료하거나
2. `.env` 파일에서 `POSTGRES_PORT` 또는 `REDIS_PORT` 값을 변경합니다

### 컨테이너 상태 확인

다음 명령어로 컨테이너 상태를 확인할 수 있습니다:

```bash
docker ps --filter "name=db" --filter "name=redis"
```

### 컨테이너 로그 확인

문제가 발생하면 다음 명령어로 로그를 확인하세요:

```bash
# PostgreSQL 로그
docker logs db

# Redis 로그
docker logs redis
```

## 주의사항

- **main-ec2** 폴더의 docker-compose 파일을 직접 참조하므로, main-ec2의 설정이 업데이트되면 자동으로 반영됩니다
- `.env` 파일은 로컬 개발용이므로 실제 프로덕션 키를 사용하지 마세요
- 데이터는 Docker 볼륨에 저장되므로, 컨테이너를 재시작해도 데이터가 유지됩니다
- 데이터를 완전히 삭제하려면 `docker-compose down -v` 명령을 사용하세요

## 기술 스택

- **PostgreSQL 16**: 메인 데이터베이스
- **Redis 7 (Alpine)**: 캐시 및 세션 저장소
- **Docker Compose**: 컨테이너 오케스트레이션

## 동작 원리

이 환경은 `infra/main-ec2` 폴더의 docker-compose 파일들을 **직접 참조**하여 실행됩니다:

1. **환경 변수 파일 복사:**
   - `start.bat` 실행 시 `local-backend/.env`를 `main-ec2/db/.env`로 자동 복사
   - `stop.bat` 실행 시 `main-ec2/db/.env`를 자동 삭제 (정리)

2. **main-ec2 설정 참조:**
   - `infra/main-ec2/db/docker-compose.psql.yml` 직접 실행
   - `infra/main-ec2/db/docker-compose.redis.yml` 직접 실행
   - Docker Compose 프로젝트 이름: `zzik-local-backend`

3. **데이터 영속성:**
   - PostgreSQL 데이터: `pgdata` Docker 볼륨에 저장
   - Redis 데이터: `redis-data` Docker 볼륨에 저장
   - `stop.bat`으로 종료해도 데이터는 유지됨
   - `clean.bat`으로 볼륨까지 삭제 시 데이터 완전 초기화

4. **Git 충돌 방지:**
   - `main-ec2/db/.gitignore`에 `.env`가 추가되어 있어 Git 추적 안 됨
   - main-ec2의 설정이 업데이트되면 **자동으로 반영**됩니다
