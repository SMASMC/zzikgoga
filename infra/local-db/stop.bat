@echo off
chcp 65001 > nul
echo ======================================
echo   로컬 백엔드 개발 환경 종료
echo ======================================
echo.

echo [1/2] Docker 실행 여부 확인 중...
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker가 실행되지 않았습니다.
    echo Docker Desktop을 실행한 후 다시 시도해주세요.
    pause
    exit /b 1
)
echo [OK] Docker가 실행 중입니다.
echo.

echo [2/3] 컨테이너 중지 및 제거 중...
cd /d "%~dp0"
docker-compose -p zzik-local-backend -f ..\main-ec2\db\docker-compose.psql.yml -f ..\main-ec2\db\docker-compose.redis.yml -f docker-compose.override.yml down

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 컨테이너 종료에 실패했습니다.
    pause
    exit /b 1
)

echo.
echo [3/3] 임시 환경 변수 파일 정리 중...
if exist ..\main-ec2\db\.env (
    del ..\main-ec2\db\.env
    echo [OK] 임시 .env 파일 삭제 완료
) else (
    echo [INFO] 삭제할 임시 .env 파일이 없습니다.
)

echo.
echo ======================================
echo   종료 완료!
echo ======================================
echo PostgreSQL과 Redis 컨테이너가 중지되었습니다.
echo.
pause
