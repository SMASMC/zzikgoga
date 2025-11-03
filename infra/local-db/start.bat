@echo off
chcp 65001 > nul
echo ======================================
echo   로컬 백엔드 개발 환경 시작
echo ======================================
echo.

echo [1/3] Docker 실행 여부 확인 중...
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker가 실행되지 않았습니다.
    echo Docker Desktop을 실행한 후 다시 시도해주세요.
    pause
    exit /b 1
)
echo [OK] Docker가 실행 중입니다.
echo.

echo [2/4] 환경 변수 파일 복사 중...
cd /d "%~dp0"
copy /Y .env ..\main-ec2\db\.env > nul
if %errorlevel% neq 0 (
    echo [ERROR] .env 파일 복사에 실패했습니다.
    pause
    exit /b 1
)
echo [OK] .env 파일 복사 완료
echo.

echo [3/4] 기존 컨테이너 확인 중...
docker ps -a --filter "name=db" --filter "name=redis" --format "{{.Names}}" | findstr /r "db redis" > nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] 기존 컨테이너가 존재합니다. 중지 및 제거 중...
    docker-compose -p zzik-local-backend -f ..\main-ec2\db\docker-compose.psql.yml -f ..\main-ec2\db\docker-compose.redis.yml down
)
echo.

echo [4/4] PostgreSQL과 Redis 컨테이너 시작 중...
docker-compose -p zzik-local-backend -f ..\main-ec2\db\docker-compose.psql.yml -f ..\main-ec2\db\docker-compose.redis.yml up -d

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 컨테이너 시작에 실패했습니다.
    echo 에러 로그를 확인해주세요.
    pause
    exit /b 1
)

echo.
echo ======================================
echo   시작 완료!
echo ======================================
echo PostgreSQL: localhost:5432
echo   - Database: zzik
echo   - User: postgres
echo   - Password: postgres
echo.
echo Redis: localhost:6379
echo   - Password: zzik
echo ======================================
echo.
echo 컨테이너 상태 확인:
docker ps --filter "name=db" --filter "name=redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo Spring Boot를 실행하여 개발을 시작하세요!
echo.
pause
