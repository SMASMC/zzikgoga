#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Grafana 설정 수정 및 재시작"

MON_DIR="/home/ubuntu/zzikgoga/infra/main-ec2/monitoring"
cd "$MON_DIR"

# 현재 Grafana 환경 변수 확인
echo "📋 현재 Grafana 환경 변수:"
docker exec grafana env | grep GF_ || true

# Grafana 컨테이너 완전 재생성
echo "🔄 Grafana 컨테이너 재생성 중..."
docker compose -p main-ec2-monitoring -f docker-compose.monitoring.yml down grafana

# 컨테이너 재시작
docker compose -p main-ec2-monitoring -f docker-compose.monitoring.yml up -d grafana

# 재시작 대기
echo "⏳ Grafana 시작 대기 중..."
sleep 10

# 새로운 환경 변수 확인
echo "✅ 새로운 Grafana 환경 변수:"
docker exec grafana env | grep GF_

echo "🎉 완료! https://monitoring.zzik.kr 접속해서 확인하세요"
