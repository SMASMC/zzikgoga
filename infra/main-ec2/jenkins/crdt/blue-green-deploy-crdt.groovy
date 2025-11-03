pipeline {
    agent any

    parameters {
        string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga-node', description: '배포할 서비스 이름')
    }

    environment {
        IMAGE_NAME = "${params.SERVICE_NAME}:latest"
    }

    stages {
        stage('Prepare Environment File') {
            steps {
                withCredentials([file(credentialsId: 'crdt-prod-env-file', variable: 'ENV_FILE')]) {
                    sh '''
                        # infra/main-ec2 디렉토리에 .env.crdt 파일 복사
                        mkdir -p infra/main-ec2
                        cp $ENV_FILE infra/main-ec2/.env.crdt
                        echo "✅ Environment file copied to infra/main-ec2/.env.crdt"

                        # 파일 권한 설정 (보안)
                        chmod 600 infra/main-ec2/.env.crdt
                        ls -la infra/main-ec2/.env.crdt
                    '''
                }
            }
        }

        stage('Verify Deployment Prerequisites') {
            steps {
                echo "🔍 Verifying deployment prerequisites"
                sh '''
                    # Docker 이미지 존재 확인
                    if ! docker images | grep -q "${SERVICE_NAME}.*latest"; then
                        echo "❌ Docker image not found: ${IMAGE_NAME}"
                        exit 1
                    fi
                    echo "✅ Docker image verified: ${IMAGE_NAME}"

                    # 배포 스크립트 존재 확인
                    if [ ! -f "infra/main-ec2/scripts/deploy-node.sh" ]; then
                        echo "❌ Deploy script not found: infra/main-ec2/scripts/deploy-node.sh"
                        exit 1
                    fi
                    echo "✅ Deploy script verified"

                    # docker-compose 파일 확인
                    if [ ! -f "infra/main-ec2/docker-compose-node-blue.yml" ]; then
                        echo "❌ docker-compose-node-blue.yml not found"
                        exit 1
                    fi
                    if [ ! -f "infra/main-ec2/docker-compose-node-green.yml" ]; then
                        echo "❌ docker-compose-node-green.yml not found"
                        exit 1
                    fi
                    echo "✅ Docker compose files verified"

                    # .env.crdt 파일 확인
                    if [ ! -f "infra/main-ec2/.env.crdt" ]; then
                        echo "❌ .env.crdt file not found"
                        exit 1
                    fi
                    echo "✅ Environment file verified"

                    # nginx 설정 파일 확인
                    if [ ! -f "infra/main-ec2/nginx/node-blue.conf" ]; then
                        echo "❌ nginx/node-blue.conf not found"
                        exit 1
                    fi
                    if [ ! -f "infra/main-ec2/nginx/node-green.conf" ]; then
                        echo "❌ nginx/node-green.conf not found"
                        exit 1
                    fi
                    echo "✅ Nginx configuration files verified"
                '''
            }
        }

        stage('Pre-Deployment Status') {
            steps {
                echo "📊 Current deployment status"
                sh '''
                    echo "🔍 Running Node containers:"
                    docker ps --filter "name=zzikgoga-node-" --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" || echo "ℹ️ No running Node containers"

                    echo ""
                    echo "📊 System resources:"
                    free -h | head -3

                    echo ""
                    echo "💾 Docker disk usage:"
                    docker system df
                '''
            }
        }

        stage('Blue-Green Deploy') {
            steps {
                dir('infra/main-ec2') {
                    sh '''
                        chmod +x scripts/deploy-node.sh

                        echo "🚀 Starting Blue-Green deployment..."
                        ./scripts/deploy-node.sh
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    echo "🔍 Final deployment status:"
                    docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" | grep "zzikgoga-node-"

                    # 실행 중인 Node 컨테이너 확인
                    CONTAINER_NAME=$(docker ps --filter "name=zzikgoga-node-" --format "{{.Names}}" | head -1)
                    if [ -z "$CONTAINER_NAME" ]; then
                        echo "❌ 실행 중인 Node 컨테이너가 없습니다"
                        exit 1
                    fi

                    # 활성 포트 확인
                    ACTIVE_PORT=$(docker port $CONTAINER_NAME | grep "3000/tcp" | cut -d: -f2)
                    echo "✅ 활성 컨테이너: $CONTAINER_NAME, 포트: $ACTIVE_PORT"

                    # nginx 설정 확인
                    NGINX_CONF=/etc/nginx/sites-enabled/node.zzik.kr
                    if [ -f "$NGINX_CONF" ]; then
                        NGINX_PORT=$(grep -E "server localhost:" "$NGINX_CONF" | head -1 | sed 's/.*localhost://;s/;.*//')
                        echo "✅ nginx 설정 포트: $NGINX_PORT"

                        # 포트 일치 확인
                        if [ "$ACTIVE_PORT" = "$NGINX_PORT" ]; then
                            echo "✅ nginx 설정과 컨테이너 포트가 일치합니다"
                        else
                            echo "⚠️ nginx 설정($NGINX_PORT)과 컨테이너 포트($ACTIVE_PORT)가 다릅니다"
                        fi
                    else
                        echo "⚠️ nginx 활성 설정 파일을 찾을 수 없습니다: $NGINX_CONF"
                    fi

                    # 헬스 체크
                    echo ""
                    echo "🏥 Health check tests:"

                    # /health 엔드포인트
                    HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$ACTIVE_PORT/health)
                    if [ "$HEALTH_CODE" = "200" ]; then
                        echo "✅ /health endpoint: OK (HTTP $HEALTH_CODE)"
                    else
                        echo "❌ /health endpoint: FAILED (HTTP $HEALTH_CODE)"
                        exit 1
                    fi

                    # /status 엔드포인트
                    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$ACTIVE_PORT/status)
                    if [ "$STATUS_CODE" = "200" ]; then
                        echo "✅ /status endpoint: OK (HTTP $STATUS_CODE)"
                    else
                        echo "⚠️ /status endpoint: (HTTP $STATUS_CODE)"
                    fi

                    # / 루트 엔드포인트
                    ROOT_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$ACTIVE_PORT/)
                    if [ "$ROOT_CODE" = "200" ]; then
                        echo "✅ / endpoint: OK (HTTP $ROOT_CODE)"
                    else
                        echo "⚠️ / endpoint: (HTTP $ROOT_CODE)"
                    fi

                    echo ""
                    echo "📋 Health check response:"
                    curl -s http://localhost:$ACTIVE_PORT/health | python3 -m json.tool || curl -s http://localhost:$ACTIVE_PORT/health
                '''
            }
        }

        stage('WebSocket Connection Test') {
            steps {
                echo "🔌 Testing WebSocket connectivity"
                sh '''
                    # 실행 중인 컨테이너 포트 확인
                    CONTAINER_NAME=$(docker ps --filter "name=zzikgoga-node-" --format "{{.Names}}" | head -1)
                    ACTIVE_PORT=$(docker port $CONTAINER_NAME | grep "3000/tcp" | cut -d: -f2)

                    # WebSocket 테스트 (websocat이 설치되어 있다면)
                    if command -v websocat &> /dev/null; then
                        echo "Testing WebSocket connection..."
                        timeout 3 websocat ws://localhost:$ACTIVE_PORT/test-doc || echo "ℹ️ WebSocket test completed"
                    else
                        echo "ℹ️ websocat not installed, skipping WebSocket test"
                        echo "ℹ️ Install with: cargo install websocat (or use package manager)"
                    fi

                    # 대안: curl로 WebSocket upgrade 헤더 테스트
                    echo ""
                    echo "Testing WebSocket upgrade headers:"
                    curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
                         -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
                         http://localhost:$ACTIVE_PORT/ 2>&1 | head -20 || true
                '''
            }
        }

        stage('PM2 Status Check') {
            steps {
                echo "🔍 Checking PM2 process status"
                sh '''
                    CONTAINER_NAME=$(docker ps --filter "name=zzikgoga-node-" --format "{{.Names}}" | head -1)

                    echo "📊 PM2 process list:"
                    docker exec $CONTAINER_NAME pm2 list || echo "⚠️ Unable to get PM2 status"

                    echo ""
                    echo "📋 PM2 process info:"
                    docker exec $CONTAINER_NAME pm2 info zzikgoga-yjs-server || echo "⚠️ Unable to get process info"

                    echo ""
                    echo "📝 Recent PM2 logs (last 20 lines):"
                    docker exec $CONTAINER_NAME pm2 logs --lines 20 --nostream || echo "⚠️ Unable to get PM2 logs"
                '''
            }
        }

        stage('Deployment Summary') {
            steps {
                sh '''
                    echo "📊 ===== DEPLOYMENT SUMMARY ====="
                    echo ""
                    echo "🎯 Active Container:"
                    docker ps --filter "name=zzikgoga-node-" --format "  - Name: {{.Names}}\\n    Status: {{.Status}}\\n    Ports: {{.Ports}}"

                    echo ""
                    echo "📦 Image Info:"
                    docker images zzikgoga-node:latest --format "  - Repository: {{.Repository}}\\n    Tag: {{.Tag}}\\n    Size: {{.Size}}\\n    Created: {{.CreatedAt}}"

                    echo ""
                    echo "💾 Container Resource Usage:"
                    docker stats --no-stream --format "table {{.Container}}\\t{{.CPUPerc}}\\t{{.MemUsage}}\\t{{.NetIO}}" $(docker ps --filter "name=zzikgoga-node-" -q)

                    echo ""
                    echo "✅ Deployment completed successfully!"
                '''
            }
        }
    }

    post {
        success {
            echo "🎉 Node CRDT Server deployment completed successfully!"
        }
        failure {
            echo "❌ Node CRDT Server deployment failed!"
            sh '''
                echo "🔍 Debugging information:"
                echo ""
                echo "Running containers:"
                docker ps -a --filter "name=zzikgoga-node-"

                echo ""
                echo "Recent logs from failed container:"
                FAILED_CONTAINER=$(docker ps -a --filter "name=zzikgoga-node-" --format "{{.Names}}" | head -1)
                if [ -n "$FAILED_CONTAINER" ]; then
                    docker logs --tail 50 $FAILED_CONTAINER
                fi
            '''
        }
        always {
            echo "🧹 Cleaning up deployment workspace"
            sh '''
                # 환경 파일 정리 (보안을 위해)
                rm -f infra/main-ec2/.env.crdt 2>/dev/null || true
                echo "✅ Environment file cleaned up"
            '''
        }
    }
}
