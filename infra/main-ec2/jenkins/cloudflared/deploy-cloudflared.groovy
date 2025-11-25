pipeline {
    agent any

    environment {
        ZZIK_DIR = '/var/lib/jenkins/zzik'
        INFRA_DIR = "${ZZIK_DIR}/infra/main-ec2"
    }

    stages {
        stage('Update Repository') {
            steps {
                sh '''
                    echo "📥 Git 저장소 업데이트..."

                    if [ -d "${ZZIK_DIR}" ]; then
                        cd ${ZZIK_DIR}
                        git config --global --add safe.directory ${ZZIK_DIR} 2>/dev/null || true
                        git fetch origin
                        git checkout infra/master
                        git pull origin infra/master
                        echo "✅ 저장소 업데이트 완료"
                    else
                        echo "❌ ${ZZIK_DIR} 디렉토리가 없습니다"
                        exit 1
                    fi
                '''
            }
        }

        stage('Deploy Cloudflared') {
            steps {
                withCredentials([string(credentialsId: 'cloudflare-tunnel-token', variable: 'CLOUDFLARE_TUNNEL_TOKEN')]) {
                    sh '''
                        echo "🚀 Cloudflare Tunnel 배포..."
                        cd ${INFRA_DIR}

                        # 기존 컨테이너 확인 및 배포
                        if docker ps -a --format '{{.Names}}' | grep -qx "cloudflared"; then
                            echo "📦 기존 cloudflared 컨테이너 업데이트..."
                            docker compose -f docker-compose-cloudflared.yml up -d --force-recreate
                        else
                            echo "🆕 cloudflared 컨테이너 생성..."
                            docker compose -f docker-compose-cloudflared.yml up -d
                        fi

                        # 시작 대기
                        echo "⏳ 컨테이너 시작 대기 (10초)..."
                        sleep 10

                        # 상태 확인
                        if docker ps --format '{{.Names}}' | grep -qx "cloudflared"; then
                            echo "✅ Cloudflare Tunnel 실행 중"
                            docker logs cloudflared --tail 20
                        else
                            echo "❌ Cloudflare Tunnel 시작 실패"
                            docker logs cloudflared --tail 50
                            exit 1
                        fi
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "🎉 Cloudflare Tunnel 배포 성공!"
        }
        failure {
            echo "❌ Cloudflare Tunnel 배포 실패"
        }
    }
}
