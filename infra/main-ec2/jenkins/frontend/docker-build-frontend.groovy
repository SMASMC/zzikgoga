pipeline {
    agent any

    parameters {
        string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga-frontend', description: '빌드용 서비스 이름')
        string(name: 'SHARED_WORKSPACE', defaultValue: '/tmp/shared-workspace', description: '공유 작업 공간 디렉터리')
    }

    environment {
        IMAGE_NAME = "${params.SERVICE_NAME}:latest"
        SHARED_DIR = "${params.SHARED_WORKSPACE}/${params.SERVICE_NAME}"
    }

    stages {
        stage('Copy Artifacts from Shared Directory') {
            steps {
                sh '''
                    if [ ! -d "${SHARED_DIR}/dist" ]; then
                        echo "❌ No dist directory found in shared workspace"
                        exit 1
                    fi

                    cp -r ${SHARED_DIR}/* .
                    echo "✅ Build artifacts copied to workspace"
                '''
            }
        }

        stage('Normalize Build Context') {
            steps {
                sh '''
                    set -e
                    # Ensure a Dockerfile exists in workspace
                    if [ ! -f Dockerfile ]; then
                      if [ -f fe.dockerfile ]; then
                        cp fe.dockerfile Dockerfile
                        echo "[INFO] Using fe.dockerfile as Dockerfile"
                      elif [ -f infra/main-ec2/dockerfiles/fe.dockerfile ]; then
                        cp infra/main-ec2/dockerfiles/fe.dockerfile Dockerfile
                        echo "[INFO] Using repo infra/main-ec2/dockerfiles/fe.dockerfile as Dockerfile"
                      fi
                    fi
                    test -f Dockerfile || { echo "[ERROR] Dockerfile not found"; ls -al; exit 1; }

                    # If Dockerfile expects nginx-spa.conf but file is missing, generate a default
                    if grep -q "COPY .*nginx-spa.conf" Dockerfile; then
                      if [ ! -f ./nginx-spa.conf ]; then
                        cat > ./nginx-spa.conf << 'NGINX'
server {
  listen 80;
  server_name _;
  location = /health { default_type text/plain; return 200 ok; }
  location / { root /usr/share/nginx/html; try_files $uri /index.html; }
  location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    root /usr/share/nginx/html; expires 1y; add_header Cache-Control "public, immutable"; try_files $uri =404; }
}
NGINX
                        echo "[WARN] Generated default nginx-spa.conf"
                      fi
                    fi

                    echo "[HEAD Dockerfile]"; head -n 40 Dockerfile || true
                    grep -n "COPY .*nginx-spa.conf" Dockerfile || echo "[DEBUG] no COPY nginx-spa.conf"
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                set -e
                # 이전 이미지 백업
                docker tag ${IMAGE_NAME} ${IMAGE_NAME}-previous || true

                # 새 이미지 빌드
                docker build -t ${IMAGE_NAME} .
                echo "✅ Docker image built successfully: ${IMAGE_NAME}"
                docker images ${SERVICE_NAME} --format "table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}"
                '''
            }
        }

        stage('Image Security Scan') {
            steps {
                echo "🔍 Scanning Docker image for vulnerabilities"
                sh '''
                    # Trivy 설치 확인 및 스캔 (선택사항)
                    if command -v trivy &> /dev/null; then
                        trivy image --severity HIGH,CRITICAL ${IMAGE_NAME} || true
                    else
                        echo "⚠️ Trivy not installed, skipping security scan"
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Docker build completed successfully"
        }
        failure {
            echo "❌ Docker build failed"
        }
    }
}
