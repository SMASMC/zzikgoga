pipeline {
    agent any

    environment {
        INFRA_DIR = 'infra/main-ec2'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: "origin/infra/master"]],
                    userRemoteConfigs: [[
                        url: 'https://lab.ssafy.com/s13-final/S13P31A102.git',
                        credentialsId: 'gitlab_username_with_pw'
                    ]],
                    extensions: [
                        [$class: 'CleanBeforeCheckout'],
                        [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [
                            [path: 'infra/main-ec2/docker-compose-cloudflared.yml']
                        ]]
                    ]
                ])
            }
        }

        stage('Deploy Cloudflared') {
            steps {
                withCredentials([string(credentialsId: 'cloudflare-tunnel-token', variable: 'CLOUDFLARE_TUNNEL_TOKEN')]) {
                    dir("${INFRA_DIR}") {
                        sh '''
                            echo "🚀 Cloudflare Tunnel 배포..."

                            # 기존 컨테이너 확인
                            if docker ps -a --format '{{.Names}}' | grep -qx "cloudflared"; then
                                echo "📦 기존 cloudflared 컨테이너 업데이트..."
                                docker compose -f docker-compose-cloudflared.yml up -d --force-recreate
                            else
                                echo "🆕 cloudflared 컨테이너 생성..."
                                docker compose -f docker-compose-cloudflared.yml up -d
                            fi

                            # 헬스 체크 대기
                            echo "⏳ 헬스 체크 대기 (30초)..."
                            sleep 30

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
