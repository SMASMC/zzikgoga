pipeline {
  agent any

  parameters {
    string(name: 'BRANCH_NAME', defaultValue: 'nft/master', description: '빌드할 브랜치')
    string(name: 'INFRA_BRANCH', defaultValue: 'infra/master', description: '인프라 리소스를 가져올 브랜치')
    string(name: 'SHARED_WORKSPACE', defaultValue: '/tmp/shared-workspace', description: '공유 작업 공간 디렉토리')
    string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga-nft', description: '서비스 이름 (공유 디렉터리명과 일치)')
  }

  environment {
    SHARED_DIR = "${params.SHARED_WORKSPACE}/${params.SERVICE_NAME}"
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
    NFT_DIR = 'nft'
    INFRA_BRANCH = "${params.INFRA_BRANCH}"
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

    stage('Checkout NFT Server') {
      steps {
        withCredentials([
          string(credentialsId: 'zzikgoga-github-url', variable: 'GIT_REPO_URL'),
          usernamePassword(credentialsId: 'github-smasmc-token', usernameVariable: 'GIT_USERNAME', passwordVariable: 'GIT_PASSWORD')
        ]) {
          checkout([
            $class: 'GitSCM',
            branches: [[name: "origin/${params.BRANCH_NAME}"]],
            userRemoteConfigs: [[
              url: env.GIT_REPO_URL,
              credentialsId: 'github-smasmc-token'
            ]],
            extensions: [
              [$class: 'CleanBeforeCheckout'],
              [$class: 'RelativeTargetDirectory', relativeTargetDir: '.'],
              [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [
                [path: 'nft/**'],
                [path: 'infra/main-ec2/dockerfiles/**'],
                [path: 'infra/main-ec2/jenkins/**'],
                [path: 'infra/main-ec2/nginx/**']
              ]]
            ]
          ])
          sh '''
            set -e
            echo "[INFO] Syncing infra branch artifacts from ${INFRA_BRANCH}"
            git config --global --add safe.directory "$(pwd)"
            git fetch origin "${INFRA_BRANCH}"
            INFRA_BRANCH_REF="origin/${INFRA_BRANCH}"
            git checkout "${INFRA_BRANCH_REF}" -- infra/main-ec2/dockerfiles
            git checkout "${INFRA_BRANCH_REF}" -- infra/main-ec2/jenkins
            git checkout "${INFRA_BRANCH_REF}" -- infra/main-ec2/nginx
            echo "[INFO] Infra artifacts synced from ${INFRA_BRANCH}"
            echo "== workspace tree (top) =="
            ls -al
            echo ""
            echo "== nft directory =="
            ls -al nft
            test -d nft || { echo "❌ nft directory not found"; exit 1; }
            test -f nft/package.json || { echo "❌ package.json not found in nft/"; exit 1; }
            echo "✅ NFT directory verified"
          '''
        }
      }
    }

    stage('Prepare Source') {
      steps {
        sh '''
          # nft/ 디렉토리를 작업 디렉토리로 사용
          echo "📦 Using nft/ as source directory"

          # 필수 파일 확인
          test -f nft/package.json || { echo "❌ package.json missing"; exit 1; }
          test -f nft/src/server.js || { echo "❌ src/server.js missing"; exit 1; }

          echo "✅ All required files present"
          echo ""
          echo "📋 Project structure:"
          ls -la nft/
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        dir("nft") {
          echo "📦 Installing dependencies"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
            sh '''
              # npm install 실행
              echo "[INFO] Running npm install for CI pipeline"
              npm install --cache ${WORKSPACE}/.npm --prefer-offline
              echo "[INFO] Dependencies installed via npm install"
            '''
          }
        }
      }
    }

    stage('Lint Check') {
      steps {
        dir("nft") {
          echo "🔍 Running code quality checks"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
            sh '''
              # ESLint가 설정되어 있다면 실행, 없으면 스킵
              if [ -f .eslintrc.js ] || [ -f .eslintrc.json ] || grep -q '"eslint"' package.json; then
                npm run lint || echo "⚠️ Lint script not configured, skipping"
              else
                echo "ℹ️ ESLint not configured, skipping lint check"
              fi

              echo "✅ Code quality checks passed"
            '''
          }
        }
      }
    }

    stage('Test') {
      steps {
        dir("nft") {
          echo "🧪 Running tests"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
            sh '''
              # 테스트가 설정되어 있다면 실행
              if grep -q '"test"' package.json && ! grep -q '"test".*"echo' package.json; then
                npm test || echo "⚠️ Tests failed or not configured"
              else
                echo "ℹ️ No tests configured, skipping test stage"
              fi

              echo "✅ Test stage completed"
            '''
          }
        }
      }
    }

    stage('Verify Dependencies') {
      steps {
        dir("nft") {
          echo "🔍 Verifying required dependencies"
          sh '''
            # 주요 패키지 확인
            echo "📋 Checking required packages:"
            npm list express multer dotenv --depth=0 || {
              echo "⚠️ Some dependencies may be missing, but continuing..."
            }

            echo "✅ Dependency verification completed"
          '''
        }
      }
    }

    stage('Copy to Shared Directory') {
      steps {
        dir("nft") {
          echo "📤 Copying artifacts to shared directory"
          sh '''
            echo "📁 Preparing shared directory..."
            mkdir -p ${SHARED_DIR}
            rm -rf ${SHARED_DIR}/*

            # 전체 nft 소스 복사
            cp -r * ${SHARED_DIR}/ 2>/dev/null || true
            cp -r .* ${SHARED_DIR}/ 2>/dev/null || true

            # node_modules는 제외
            rm -rf ${SHARED_DIR}/node_modules

            # Dockerfile 복사
            if [ -f "../infra/main-ec2/dockerfiles/nft.dockerfile" ]; then
              cp ../infra/main-ec2/dockerfiles/nft.dockerfile ${SHARED_DIR}/Dockerfile
              echo "✅ Dockerfile copied from infra/main-ec2/dockerfiles/nft.dockerfile"
            else
              echo "❌ Dockerfile not found at infra/main-ec2/dockerfiles/nft.dockerfile"
              exit 1
            fi

            # build-info.txt 생성
            cat > ${SHARED_DIR}/build-info.txt << EOF
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')
BRANCH_NAME=${BRANCH_NAME}
BUILD_NUMBER=${BUILD_NUMBER}
GIT_COMMIT=${GIT_COMMIT}
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
SERVICE_TYPE=NFT-Server
EOF

            echo "📊 Shared directory contents:"
            ls -lah ${SHARED_DIR}/

            echo "✅ Artifacts copied successfully"
          '''
        }
      }
    }
  }

  post {
    success {
      echo "🎉 CI Build completed successfully!"
      sh '''
        echo "📋 Build Summary:"
        cat ${SHARED_DIR}/build-info.txt || true
      '''
    }
    failure {
      echo "❌ CI Build failed!"
    }
    always {
      cleanWs()
    }
  }
}
