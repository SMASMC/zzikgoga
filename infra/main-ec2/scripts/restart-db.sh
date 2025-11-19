#!/usr/bin/env bash
set -euo pipefail

################################################################################
# DB 컨테이너 안전 재시작 스크립트
#
# 목적: PostgreSQL과 Redis 컨테이너를 안전하게 재시작
# 용도:
#   - 환경 변수 변경 적용 (TZ, PGTZ 등)
#   - 설정 파일 변경 적용
#   - 컨테이너 이미지 업데이트 후 재시작
#   - 기타 DB 재시작이 필요한 경우
#
# 주의:
#   - 데이터 손실 없음 (볼륨 유지)
#   - 애플리케이션 컨테이너는 건드리지 않음
#   - 재시작 중 약 10-20초간 DB 연결 불가
################################################################################

echo "========================================"
echo "  DB 컨테이너 재시작"
echo "========================================"
echo "⏰ 시작 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 스크립트 경로 기준으로 루트 디렉토리 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DB_DIR="${ROOT_DIR}/db"

# 색상 정의 (가독성 향상)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 에러 처리 함수
error_exit() {
    echo -e "${RED}❌ 오류: $1${NC}" >&2
    exit 1
}

success_msg() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning_msg() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info_msg() {
    echo "ℹ️  $1"
}

################################################################################
# 1. 사전 검증
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  사전 검증"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Docker 실행 확인
if ! docker info >/dev/null 2>&1; then
    error_exit "Docker가 실행 중이지 않습니다. Docker를 시작한 후 다시 시도하세요."
fi
success_msg "Docker가 실행 중입니다"

# docker-compose 파일 존재 확인
if [ ! -f "${DB_DIR}/docker-compose.psql.yml" ]; then
    error_exit "PostgreSQL compose 파일이 없습니다: ${DB_DIR}/docker-compose.psql.yml"
fi

if [ ! -f "${DB_DIR}/docker-compose.redis.yml" ]; then
    error_exit "Redis compose 파일이 없습니다: ${DB_DIR}/docker-compose.redis.yml"
fi
success_msg "docker-compose 파일 확인 완료"

# .env 파일 확인
if [ ! -f "${DB_DIR}/.env" ]; then
    error_exit ".env 파일이 없습니다: ${DB_DIR}/.env"
fi
success_msg ".env 파일 확인 완료"

# 환경 변수 읽기
source "${DB_DIR}/.env" 2>/dev/null || true
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-postgres}"
REDIS_CONTAINER="${REDIS_DB:-redis}"

echo ""

################################################################################
# 2. 현재 DB 컨테이너 상태 확인
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  현재 DB 컨테이너 상태 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# PostgreSQL 컨테이너 찾기 (여러 이름 가능성 처리)
POSTGRES_CONTAINER=""
for name in "my-postgres-db" "zzik-db" "postgres" "db"; do
    if docker ps --format '{{.Names}}' | grep -qx "$name"; then
        POSTGRES_CONTAINER="$name"
        break
    fi
done

if [ -z "$POSTGRES_CONTAINER" ]; then
    error_exit "실행 중인 PostgreSQL 컨테이너를 찾을 수 없습니다"
fi
info_msg "PostgreSQL 컨테이너: ${POSTGRES_CONTAINER}"

# Redis 컨테이너 확인
if ! docker ps --format '{{.Names}}' | grep -qx "$REDIS_CONTAINER"; then
    error_exit "실행 중인 Redis 컨테이너를 찾을 수 없습니다: ${REDIS_CONTAINER}"
fi
info_msg "Redis 컨테이너: ${REDIS_CONTAINER}"

# 애플리케이션 컨테이너 확인 (참고용)
echo ""
info_msg "실행 중인 애플리케이션 컨테이너 확인 중..."
APP_CONTAINERS=$(docker ps --filter "name=zzikgoga-" --format '{{.Names}}' || true)
if [ -n "$APP_CONTAINERS" ]; then
    echo "$APP_CONTAINERS" | while read -r container; do
        echo "  - $container"
    done
    warning_msg "애플리케이션이 실행 중입니다. DB 재시작 중 일시적으로 연결이 끊길 수 있습니다."
else
    info_msg "실행 중인 애플리케이션 없음"
fi

echo ""

################################################################################
# 3. 사용자 확인
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  작업 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "다음 컨테이너를 재시작합니다:"
echo "  - PostgreSQL: ${POSTGRES_CONTAINER}"
echo "  - Redis: ${REDIS_CONTAINER}"
echo ""
echo "⚠️  주의사항:"
echo "  • 데이터는 보존됩니다 (볼륨 유지)"
echo "  • 재시작 중 약 10-20초간 DB 연결 불가"
echo "  • 애플리케이션에서 일시적 연결 오류 발생 가능"
echo ""
read -p "계속하시겠습니까? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo "작업이 취소되었습니다."
    exit 0
fi

echo ""

################################################################################
# 4. PostgreSQL 재시작
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  PostgreSQL 재시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info_msg "PostgreSQL 재시작 중... (컨테이너: ${POSTGRES_CONTAINER})"

# docker-compose restart 사용 (가장 안전)
cd "${DB_DIR}"
if docker compose -p main-ec2 -f docker-compose.psql.yml restart db; then
    success_msg "PostgreSQL 컨테이너 재시작 완료"
else
    # docker-compose가 실패하면 docker restart 시도
    warning_msg "docker-compose 재시작 실패, docker restart 시도 중..."
    if docker restart "$POSTGRES_CONTAINER"; then
        success_msg "PostgreSQL 컨테이너 재시작 완료 (docker restart)"
    else
        error_exit "PostgreSQL 재시작 실패"
    fi
fi

# PostgreSQL 헬스 체크
info_msg "PostgreSQL 헬스 체크 대기 중..."
DB_READY=0
for i in $(seq 1 60); do
    if docker exec "$POSTGRES_CONTAINER" pg_isready -U "${POSTGRES_USER}" >/dev/null 2>&1; then
        success_msg "PostgreSQL 정상 실행 확인 (${i}초 소요)"
        DB_READY=1
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ $DB_READY -eq 0 ]; then
    error_exit "PostgreSQL이 60초 내에 준비되지 않았습니다"
fi

# PostgreSQL 연결 테스트
if docker exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -c "SELECT 1;" >/dev/null 2>&1; then
    success_msg "PostgreSQL 연결 테스트 성공"
else
    warning_msg "PostgreSQL 연결 테스트 실패, 하지만 진행합니다"
fi

echo ""

################################################################################
# 5. Redis 재시작
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Redis 재시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

info_msg "Redis 재시작 중... (컨테이너: ${REDIS_CONTAINER})"

# docker-compose restart 사용
cd "${DB_DIR}"
if docker compose -p main-ec2 -f docker-compose.redis.yml restart redis; then
    success_msg "Redis 컨테이너 재시작 완료"
else
    # docker-compose가 실패하면 docker restart 시도
    warning_msg "docker-compose 재시작 실패, docker restart 시도 중..."
    if docker restart "$REDIS_CONTAINER"; then
        success_msg "Redis 컨테이너 재시작 완료 (docker restart)"
    else
        error_exit "Redis 재시작 실패"
    fi
fi

# Redis 헬스 체크
info_msg "Redis 헬스 체크 대기 중..."
REDIS_READY=0
for i in $(seq 1 30); do
    rd_health=$(docker inspect -f '{{.State.Health.Status}}' "${REDIS_CONTAINER}" 2>/dev/null || echo 'unknown')
    if [ "${rd_health}" = "healthy" ]; then
        success_msg "Redis 정상 실행 확인 (${i}초 소요)"
        REDIS_READY=1
        break
    fi
    echo -n "."
    sleep 1
done
echo ""

if [ $REDIS_READY -eq 0 ]; then
    warning_msg "Redis 헬스체크 타임아웃, 수동 확인 중..."
    # 헬스체크가 없을 수도 있으니 수동 ping 테스트
    if docker exec "$REDIS_CONTAINER" redis-cli ping >/dev/null 2>&1; then
        success_msg "Redis PING 응답 확인"
    else
        error_exit "Redis가 정상적으로 시작되지 않았습니다"
    fi
fi

echo ""

################################################################################
# 6. 최종 확인
################################################################################

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  최종 확인"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 컨테이너 상태 확인
echo ""
info_msg "DB 컨테이너 상태:"
docker ps --filter "name=${POSTGRES_CONTAINER}" --filter "name=${REDIS_CONTAINER}" \
    --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 타임존 설정 확인 (참고용)
echo ""
info_msg "현재 타임존 설정 (참고용):"
PG_TZ=$(docker exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SHOW timezone;" 2>/dev/null || echo "확인 실패")
echo "  PostgreSQL timezone: ${PG_TZ}"

PG_NOW=$(docker exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -tAc "SELECT now();" 2>/dev/null || echo "확인 실패")
echo "  PostgreSQL now(): ${PG_NOW}"

REDIS_TIME=$(docker exec "$REDIS_CONTAINER" date 2>/dev/null || echo "확인 실패")
echo "  Redis 시스템 시간: ${REDIS_TIME}"

echo ""
echo "========================================"
echo "  ✅ 재시작 완료!"
echo "========================================"
echo "⏰ 완료 시간: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

success_msg "모든 DB 컨테이너가 정상적으로 재시작되었습니다"
echo ""
info_msg "추가 정보:"
echo "  • 애플리케이션 재시작은 필요하지 않습니다"
echo "  • 캐시된 DB 연결은 자동으로 재연결됩니다"
echo ""
info_msg "로그 확인 방법:"
echo "  • PostgreSQL: docker logs ${POSTGRES_CONTAINER} --tail 50"
echo "  • Redis: docker logs ${REDIS_CONTAINER} --tail 50"

exit 0
