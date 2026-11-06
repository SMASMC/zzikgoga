pipeline {
    agent any

    parameters {
        string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga-frontend', description: '배포할 서비스 이름')
    }

    environment {
        IMAGE_NAME = "${params.SERVICE_NAME}:latest"
    }

    stages {
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
                    
                    # 배포 스크립트 존재 확인 (frontend)
                    if [ ! -f "infra/main-ec2/scripts/deploy-frontend.sh" ]; then
                        echo "❌ Deploy script not found: infra/main-ec2/scripts/deploy-frontend.sh"
                        exit 1
                    fi
                    echo "✅ Deploy script verified"
                '''
            }
        }

        stage('Blue-Green Deploy') {
            steps {
                    dir('infra/main-ec2') {
                        sh '''
                            chmod +x scripts/deploy-frontend.sh
                            ./scripts/deploy-frontend.sh
                        '''
                    }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    echo "🔍 Final deployment status:"
                    docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" | grep frontend-

                    # 실행 중인 frontend 컨테이너의 포트 확인
                    CONTAINER_NAME=$(docker ps --filter "name=frontend-" --format "{{.Names}}")
                    if [ -z "$CONTAINER_NAME" ]; then
                        echo "❌ 실행 중인 frontend 컨테이너가 없습니다"
                        exit 1
                    fi

                    ACTIVE_PORT=$(docker port $CONTAINER_NAME | grep "80/tcp" | cut -d: -f2)
                    echo "✅ 활성 컨테이너: $CONTAINER_NAME, 포트: $ACTIVE_PORT"

                    # nginx 설정 확인 (sites-enabled/zzik.store 사용)
                    NGINX_CONF=/etc/nginx/sites-enabled/zzik.store
                    if [ -f "$NGINX_CONF" ]; then
                        NGINX_PORT=$(grep -E "server localhost:" "$NGINX_CONF" | head -1 | sed 's/.*localhost://;s/;.*//')
                    else
                        echo "⚠️ nginx 활성 설정 파일을 찾을 수 없습니다: $NGINX_CONF"
                        NGINX_PORT=""
                    fi
                    echo "✅ nginx 설정 포트: $NGINX_PORT"

                    # 포트 일치 확인
                    if [ -n "$NGINX_PORT" ] && [ "$ACTIVE_PORT" = "$NGINX_PORT" ]; then
                        echo "✅ nginx 설정과 컨테이너 포트가 일치합니다"
                    else
                        echo "⚠️ nginx 설정($NGINX_PORT)과 컨테이너 포트($ACTIVE_PORT)가 다릅니다 (참고: nginx 설정이 없거나 업스트림 기반일 수 있음)"
                    fi

                    # 헬스 체크 (메인 페이지로 확인)
                    if curl -f http://localhost:$ACTIVE_PORT/ > /dev/null 2>&1; then
                        echo "✅ 헬스 체크 성공: 포트 $ACTIVE_PORT"
                    else
                        echo "❌ 헬스 체크 실패: 포트 $ACTIVE_PORT"
                        exit 1
                    fi
                '''
            }
        }

        stage('Runtime Env Verify') {
            steps {
                sh '''
                    set -e
                    # 활성 컨테이너 선택
                    CONTAINER_NAME=$(docker ps --filter "name=zzikgoga-frontend-" --format "{{.Names}}" | head -1)
                    if [ -z "$CONTAINER_NAME" ]; then
                        echo "❌ 활성 frontend 컨테이너를 찾지 못했습니다"; exit 1
                    fi
                    echo "🔎 Runtime env check on: $CONTAINER_NAME"

                    # 컨테이너 환경변수 중 공개 가능한 키 이름만 출력 (값 노출 금지)
                    echo "📛 Present env var names (prefix: VITE_, GOOGLE_, REACT_APP_):"
                    docker exec "$CONTAINER_NAME" sh -lc 'printenv | grep -E "^(VITE_|GOOGLE_|REACT_APP_)" | cut -d= -f1 | sort' || true

                    # 현재 서빙 페이지에서 Google Maps 스크립트와 key 파라미터 존재 여부 확인 (값 마스킹)
                    ACTIVE_PORT=$(docker port "$CONTAINER_NAME" | grep "80/tcp" | head -1 | awk -F: '{print $NF}')
                    if [ -n "$ACTIVE_PORT" ]; then
                        MAPS_URL=$(curl -s "http://localhost:$ACTIVE_PORT/" | grep -o 'maps.googleapis.com/maps/api/js[^"\'\']*' | head -1 || true)
                        if [ -n "$MAPS_URL" ]; then
                            echo "🗺️  maps script: ${MAPS_URL%%key=*}key=***MASKED"
                        else
                            echo "ℹ️ landing 페이지에서 maps 스크립트를 찾지 못했습니다 (다른 경로에서 로드될 수 있음)"
                        fi
                    fi
                '''
            }
        }

        stage('Cache Warm-up') {
            steps {
                echo "🔥 Warming up cache"
                sh '''
                    # 주요 페이지 미리 로드
                    curl -s http://localhost:3001/ > /dev/null || curl -s http://localhost:3002/ > /dev/null
                '''
            }
        }
    }

    post {
        success {
            echo "🎉 Frontend deployment completed successfully!"
        }
        failure {
            echo "❌ Frontend deployment failed!"
        }
        always {
            echo "🧹 Cleaning up deployment workspace"
        }
    }
}
