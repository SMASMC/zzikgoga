@echo off
chcp 65001 > nul
echo ======================================
echo   로컬 백엔드 개발 환경 완전 초기화
echo ======================================
echo.
echo [경고] 이 작업은 다음을 삭제합니다:
echo   - PostgreSQL 컨테이너 및 모든 데이터
echo   - Redis 컨테이너 및 모든 데이터
echo   - Docker 볼륨 (pgdata, redis-data)
echo.
echo 계속하시겠습니까?
echo.
choice /C YN /M "Y: 예, 삭제합니다  N: 아니오, 취소합니다"
if %errorlevel% neq 1 (
    echo.
    echo [취소됨] 작업이 취소되었습니다.
    pause
    exit /b 0
)

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

echo [2/3] 컨테이너 및 볼륨 삭제 중...
cd /d "%~dp0"
docker-compose -p zzik-local-backend -f ..\main-ec2\db\docker-compose.psql.yml -f ..\main-ec2\db\docker-compose.redis.yml down -v

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] 삭제 작업에 실패했습니다.
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
echo   초기화 완료!
echo ======================================
echo 모든 컨테이너와 데이터가 삭제되었습니다.
echo start.bat을 실행하면 깨끗한 상태로 다시 시작할 수 있습니다.
echo.
pause
