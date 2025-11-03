pipeline {
    agent any

    parameters {
        string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga-node', description: '빌드용 서비스 이름')
        string(name: 'SHARED_WORKSPACE', defaultValue: '/tmp/shared-workspace', description: '공유 작업 공간 디렉토리')
    }

    environment {
        IMAGE_NAME = "${params.SERVICE_NAME}:latest"
        SHARED_DIR = "${params.SHARED_WORKSPACE}/${params.SERVICE_NAME}"
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

                        # 파일 권한 확인
                        ls -la infra/main-ec2/.env.crdt
                    '''
                }
            }
        }

        stage('Copy Artifacts from Shared Directory') {
            steps {
                sh '''
                    if [ ! -f "${SHARED_DIR}/package.json" ]; then
                        echo "❌ No package.json found in shared workspace"
                        exit 1
                    fi

                    if [ ! -f "${SHARED_DIR}/dist/server.js" ]; then
                        if [ -f "${SHARED_DIR}/dist/index.js" ]; then
                            echo "[INFO] dist/server.js missing; copying dist/index.js for compatibility"
                            cp "${SHARED_DIR}/dist/index.js" "${SHARED_DIR}/dist/server.js"
                        else
                            echo "❌ dist/server.js not found in shared workspace"
                            find "${SHARED_DIR}" -maxdepth 2 -type f -name '*.js' 2>/dev/null || true
                            exit 1
                        fi
                    fi

                    cp -r ${SHARED_DIR}/* .
                    echo "✅ Build artifacts copied to workspace"

                    echo "📋 Copied files:"
                    ls -lah
                '''
            }
        }

        stage('Prepare Build Context') {
            steps {
                sh '''
                    set -e

                    # Dockerfile 확인
                    if [ ! -f Dockerfile ]; then
                        if [ -f node.dockerfile ]; then
                            cp node.dockerfile Dockerfile
                            echo "ℹ️ Using node.dockerfile as Dockerfile"
                        else
                            echo "❌ Dockerfile not found"
                            exit 1
                        fi
                    fi

                    # 필수 파일 확인
                    test -f package.json || { echo "❌ package.json missing"; exit 1; }
                    test -f dist/server.js || { echo "❌ dist/server.js missing"; exit 1; }
                    test -f ecosystem.config.js || { echo "❌ ecosystem.config.js missing"; exit 1; }
                    test -f build-info.txt || { echo "⚠️ build-info.txt missing"; }

                    echo "✅ Build context prepared"
                    echo ""
                    echo "📄 Dockerfile preview:"
                    head -n 20 Dockerfile
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    set -e

                    # 이전 이미지 백업
                    docker tag ${IMAGE_NAME} ${IMAGE_NAME}-previous 2>/dev/null || echo "ℹ️ No previous image to backup"

                    # 새 이미지 빌드
                    echo "🔨 Building Docker image: ${IMAGE_NAME}"
                    docker build -t ${IMAGE_NAME} .

                    echo "✅ Docker image built successfully: ${IMAGE_NAME}"
                    docker images ${SERVICE_NAME} --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}"
                '''
            }
        }

        stage('Verify Image') {
            steps {
                sh '''
                    set -e

                    echo "🔍 Verifying Docker image contents"

                    # 이미지에서 주요 파일 확인
                    echo "📋 Checking files in image:"
                    docker run --rm ${IMAGE_NAME} ls -la /app/ || true

                    # package.json 버전 확인
                    echo ""
                    echo "📦 Package versions:"
                    docker run --rm ${IMAGE_NAME} cat /app/package.json | grep -E '"(name|version|dependencies)"' || true

                    # Node 버전 확인
                    echo ""
                    echo "🔢 Node version in image:"
                    docker run --rm ${IMAGE_NAME} node --version

                    # PM2 설치 확인
                    echo ""
                    echo "🔢 PM2 version in image:"
                    docker run --rm ${IMAGE_NAME} npm list pm2 --depth=0 || true

                    echo "✅ Image verification completed"
                '''
            }
        }

        stage('Image Security Scan') {
            steps {
                echo "🔍 Scanning Docker image for vulnerabilities"
                sh '''
                    # Trivy 설치 확인 및 스캔 (선택사항)
                    if command -v trivy &> /dev/null; then
                        echo "Running Trivy security scan..."
                        trivy image --severity HIGH,CRITICAL ${IMAGE_NAME} || true
                    else
                        echo "⚠️ Trivy not installed, skipping security scan"
                        echo "ℹ️ To install Trivy: https://aquasecurity.github.io/trivy/"
                    fi
                '''
            }
        }

        stage('Quick Smoke Test') {
            steps {
                echo "🧪 Running quick smoke test"
                sh '''
                    set -e

                    # 임시 컨테이너로 5초 실행 후 종료
                    CONTAINER_ID=$(docker run -d -p 13000:3000 -e ENV_COLOR=test ${IMAGE_NAME})

                    echo "⏳ Waiting for server to start..."
                    sleep 5

                    # Health check
                    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:13000/health || echo "000")

                    # 컨테이너 정리
                    docker stop $CONTAINER_ID
                    docker rm $CONTAINER_ID

                    if [ "$HTTP_CODE" = "200" ]; then
                        echo "✅ Smoke test passed (HTTP $HTTP_CODE)"
                    else
                        echo "❌ Smoke test failed (HTTP $HTTP_CODE)"
                        exit 1
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Docker build completed successfully"
            sh '''
                echo "📊 Final image info:"
                docker images ${SERVICE_NAME}:latest --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.CreatedAt}}"
            '''
        }
        failure {
            echo "❌ Docker build failed"
        }
        always {
            sh '''
                # 환경 파일 정리 (보안을 위해)
                rm -f infra/main-ec2/.env.crdt 2>/dev/null || true
            '''
        }
    }
}
