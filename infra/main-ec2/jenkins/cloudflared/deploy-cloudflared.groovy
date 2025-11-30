pipeline {
    agent any

    parameters {
        string(name: 'INFRA_BRANCH', defaultValue: 'infra/master', description: '인프라 브랜치')
    }

    environment {
        INFRA_DIR = 'infra/main-ec2'
    }

    stages {
        stage('Checkout Infra') {
            steps {
                withCredentials([string(credentialsId: 'zzikgoga-github-url', variable: 'GIT_REPO_URL')]) {
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "origin/${params.INFRA_BRANCH}"]],
                        userRemoteConfigs: [[
                            url: env.GIT_REPO_URL,
                            credentialsId: 'github-smasmc-token'
                        ]],
                        extensions: [
                            [$class: 'CleanBeforeCheckout'],
                            [$class: 'RelativeTargetDirectory', relativeTargetDir: '.'],
                            [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [
                                [path: 'infra/main-ec2/**']
                            ]]
                        ]
                    ])
                }
                sh '''
                    echo "📥 저장소 체크아웃 완료"
                    test -d infra/main-ec2 || { echo "❌ infra/main-ec2 디렉토리 없음"; exit 1; }
                    test -f infra/main-ec2/docker-compose-cloudflared.yml || { echo "❌ docker-compose-cloudflared.yml 없음"; exit 1; }
                    echo "✅ 필수 파일 확인 완료"
                '''
            }
        }

        stage('Deploy Cloudflared') {
            steps {
                dir("${INFRA_DIR}") {
                    withCredentials([string(credentialsId: 'cloudflare-tunnel-token', variable: 'CLOUDFLARE_TUNNEL_TOKEN')]) {
                        sh '''
                            echo "🚀 Cloudflare Tunnel 배포..."

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
    }

    post {
        success {
            echo "🎉 Cloudflare Tunnel 배포 성공!"
        }
        failure {
            echo "❌ Cloudflare Tunnel 배포 실패"
        }
        always {
            cleanWs()
        }
    }
}
