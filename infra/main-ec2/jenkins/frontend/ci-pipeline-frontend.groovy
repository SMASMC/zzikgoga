pipeline {
  agent any

  parameters {
    string(name: 'BRANCH_NAME', defaultValue: 'fe/master', description: '빌드할 브랜치')
    string(name: 'SHARED_WORKSPACE', defaultValue: '/tmp/shared-workspace', description: '공유 작업 공간 디렉토리')
    string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga-frontend', description: '서비스 이름 (공유 디렉터리명과 일치)')
  }

  environment {
    SHARED_DIR = "${params.SHARED_WORKSPACE}/${params.SERVICE_NAME}"
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
    FE_DIR = 'zzik-front'
  }

  tools {
    nodejs "NodeJS-22"
  }

  stages {
    stage('Environment Setup') {
      steps {
        echo "🔧 Setting up Node.js environment"
        sh 'node --version && npm --version'
      }
    }

    stage('Checkout Frontend') {
    steps {
        checkout([
        $class: 'GitSCM',
        branches: [[name: "origin/${params.BRANCH_NAME}"]],
        userRemoteConfigs: [[
            url: 'https://lab.ssafy.com/s13-final/S13P31A102.git',
            credentialsId: 'gitlab_username_with_pw'
        ]],
        extensions: [
            [$class: 'CleanBeforeCheckout'],
            [$class: 'RelativeTargetDirectory', relativeTargetDir: '.'],
            [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [[path: 'zzik-front/**'], [path: 'infra/main-ec2/dockerfiles/**']]]
        ]
        ])
        sh '''
        echo "== workspace tree (top) =="
        ls -al
        echo ""
        echo "== zzik-front top =="
        ls -al zzik-front
        test -f zzik-front/package.json || { echo "❌ zzik-front/package.json 없음"; exit 1; }
        '''
    }
    }

    stage('Setup Environment (.env)') {
      when { expression { env.SKIP_BUILD != 'true' } }
      steps {
        withCredentials([file(credentialsId: "fe-prod-env-file", variable: 'ENV_FILE')]) {
          dir("${FE_DIR}") {
            sh '''
              set -e
              cp "${ENV_FILE}" .env
              chmod 600 .env
              command -v dos2unix >/dev/null 2>&1 && dos2unix .env || true
              echo "✅ Environment file prepared for build"
              # .env 로드 (쉘 환경엔 올리되 출력은 안 함)
              set -a; . ./.env; set +a
              echo "VITE_API_BASE_URL => ${VITE_API_BASE_URL:-undefined}"
            '''
          }
        }
      }
    }

    stage('Install Dependencies') {
      steps {
        dir("${FE_DIR}") {
          echo "📦 Installing dependencies"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
            sh '''
              npm ci --cache .npm --prefer-offline
            '''
          }
        }
      }
    }

    stage('Lint & Type Check') {
      steps {
        dir("${FE_DIR}") {
          echo "🔍 Running ESLint and TypeScript checks"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
            sh '''
              npm run lint
            '''
          }
        }
      }
    }

    stage('Build') {
      steps {
        dir("${FE_DIR}") {
          echo "🔨 Building React application"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
              sh '''
                  echo "🔍 Pre-build environment check:"
                  echo "📁 .env file status: $(test -f .env && echo 'EXISTS' || echo 'MISSING')"                  
                  echo "🚀 Starting Vite build..."
                  npm run build
                  
                  echo "✅ Build completed. Verifying build output..."
                  echo "📁 Dist directory: $(ls -la dist/ | head -5)"
                  echo "📊 Dist size: $(du -sh dist/)"
              '''
          }
        }
      }
    }

    stage('Verify Build & Copy to Shared Directory') {
      steps {
        dir("${FE_DIR}") {
            echo "🔍 Verifying build artifacts and copying to shared directory"
            sh '''
                echo "🧪 Build verification:"
                
                # 빌드된 JS 파일에서 환경변수 치환 확인
                echo "📋 Checking environment variable substitution in build:"
                if find dist/assets -name "*.js" -type f | head -1 >/dev/null 2>&1; then
                    if find dist/assets -name "*.js" -exec grep -l "fintech-osm" {} \\; 2>/dev/null | head -1; then
                        echo "✅ Environment variables found in build files"
                        echo "📄 Sample URLs found:"
                        find dist/assets -name "*.js" -exec grep -h "fintech-osm" {} \\; 2>/dev/null | head -3 || echo "No specific URLs found"
                    else
                        echo "❌ Environment variables NOT found in build files"
                    fi
                    
                    echo "🔍 Checking for undefined values:"
                    if find dist/assets -name "*.js" -exec grep -l "undefined" {} \\; 2>/dev/null | head -1; then
                        echo "⚠️ undefined values found in build - check configuration"
                    else
                        echo "✅ No undefined values detected"
                    fi
                else
                    echo "❌ No JavaScript files found in dist/assets/"
                fi
                
                echo "📊 Build artifacts summary:"
                echo "📁 Total files: $(find dist -type f | wc -l)"
                echo "📁 JS files: $(find dist -name '*.js' | wc -l)"
                echo "📁 CSS files: $(find dist -name '*.css' | wc -l)"
                echo "📊 Largest files:"
                ls -lhS dist/assets/ | head -3
                
                echo "📤 Copying to shared directory..."
                mkdir -p ${SHARED_DIR}
                rm -rf ${SHARED_DIR}/*
                cp -r dist ${SHARED_DIR}/
                # Bring infra Dockerfile/nginx conf into shared dir (now present via sparse checkout)
                if [ -f "../infra/main-ec2/dockerfiles/fe.dockerfile" ]; then
                  cp ../infra/main-ec2/dockerfiles/fe.dockerfile "${SHARED_DIR}/Dockerfile"
                  echo "[OK] Dockerfile from infra/main-ec2/dockerfiles/fe.dockerfile"
                fi
                if [ -f "../infra/main-ec2/dockerfiles/nginx-spa.conf" ]; then
                  cp ../infra/main-ec2/dockerfiles/nginx-spa.conf "${SHARED_DIR}/nginx-spa.conf"
                  echo "[OK] nginx-spa.conf from infra path"
                fi

                # Prefer infra Dockerfile and nginx-http-only.conf if present
                if [ -f "../main-ec2/dockerfiles/fe.dockerfile" ]; then
                  cp ../main-ec2/dockerfiles/fe.dockerfile "${SHARED_DIR}/Dockerfile"
                  echo "[OK] Dockerfile from infra/main-ec2/dockerfiles/fe.dockerfile"
                  if [ -f "../main-ec2/dockerfiles/nginx-http-only.conf" ]; then
                    cp ../main-ec2/dockerfiles/nginx-http-only.conf "${SHARED_DIR}/nginx-http-only.conf"
                    echo "[OK] nginx-http-only.conf from infra path"
                  fi
                else
                  # Fallback: project Dockerfile if exists
                  cp Dockerfile "${SHARED_DIR}/" 2>/dev/null || echo "[INFO] No project Dockerfile; infra Dockerfile will be required in Docker build job"
                  [ -f nginx-http-only.conf ] && cp nginx-http-only.conf "${SHARED_DIR}/nginx-http-only.conf" || true
                fi

                cat > ${SHARED_DIR}/build-info.txt << EOF
BUILD_DATE=$(date)
BRANCH_NAME=${BRANCH_NAME}
BUILD_NUMBER=${BUILD_NUMBER}
GIT_COMMIT=${GIT_COMMIT}
NODE_VERSION=${NODE_VERSION}
ENV_VARS_FOUND=$(find dist/assets -name "*.js" -exec grep -l "fintech-osm" {} \\; 2>/dev/null | wc -l)
EOF
            '''
        }
      }
    }
  }

    post {
        success {
            echo "🎉 CI Build completed successfully!"
        }
        failure {
            echo "❌ CI Build failed!"
        }
        always {
            sh 'rm -f .env || true'
            cleanWs()
        }
    }
}
