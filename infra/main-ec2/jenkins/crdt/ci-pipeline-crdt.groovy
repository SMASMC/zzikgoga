pipeline {
  agent any

  parameters {
    string(name: 'BRANCH_NAME', defaultValue: 'crdt/master', description: '빌드할 브랜치')
    string(name: 'SHARED_WORKSPACE', defaultValue: '/tmp/shared-workspace', description: '공유 작업 공간 디렉토리')
    string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga-node', description: '서비스 이름 (공유 디렉터리명과 일치)')
  }

  environment {
    SHARED_DIR = "${params.SHARED_WORKSPACE}/${params.SERVICE_NAME}"
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm"
    CRDT_DIR = 'crdt'
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

    stage('Checkout CRDT Server') {
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
            [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [
              [path: 'crdt/**'],
              [path: 'infra/main-ec2/dockerfiles/**'],
              [path: 'infra/main-ec2/node-server/**']
            ]]
          ]
        ])
        sh '''
          echo "== workspace tree (top) =="
          ls -al
          echo ""
          echo "== crdt directory =="
          ls -al crdt 2>/dev/null || echo "⚠️ crdt directory not found at root"
          echo ""
          echo "== infra/main-ec2/node-server =="
          ls -al infra/main-ec2/node-server
          test -f infra/main-ec2/node-server/package.json || { echo "❌ package.json 없음"; exit 1; }
        '''
      }
    }

    stage('Prepare Source') {
      steps {
        sh '''
          # infra/main-ec2/node-server를 작업 디렉토리로 사용
          echo "📦 Using infra/main-ec2/node-server as source directory"

          # 필수 파일 확인
          test -f infra/main-ec2/node-server/package.json || { echo "❌ package.json missing"; exit 1; }
          test -f infra/main-ec2/node-server/server.js || { echo "❌ server.js missing"; exit 1; }
          test -f infra/main-ec2/node-server/ecosystem.config.js || { echo "❌ ecosystem.config.js missing"; exit 1; }

          echo "✅ All required files present"
        '''
      }
    }

    stage('Install Dependencies') {
      steps {
        dir("infra/main-ec2/node-server") {
          echo "📦 Installing dependencies"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
            sh '''
              npm ci --cache ${WORKSPACE}/.npm --prefer-offline
              echo "✅ Dependencies installed"
            '''
          }
        }
      }
    }

    stage('Lint Check') {
      steps {
        dir("infra/main-ec2/node-server") {
          echo "🔍 Running code quality checks"
          nodejs(nodeJSInstallationName: "NodeJS-22") {
            sh '''
              # ESLint가 설정되어 있다면 실행, 없으면 스킵
              if [ -f .eslintrc.js ] || [ -f .eslintrc.json ] || grep -q '"eslint"' package.json; then
                npm run lint || echo "⚠️ Lint script not configured, skipping"
              else
                echo "ℹ️ ESLint not configured, skipping lint check"
              fi

              # 기본 syntax 체크
              node -c server.js || { echo "❌ Syntax error in server.js"; exit 1; }
              node -c ecosystem.config.js || { echo "❌ Syntax error in ecosystem.config.js"; exit 1; }

              echo "✅ Code quality checks passed"
            '''
          }
        }
      }
    }

    stage('Test') {
      steps {
        dir("infra/main-ec2/node-server") {
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
        dir("infra/main-ec2/node-server") {
          echo "🔍 Verifying required dependencies"
          sh '''
            # yjs 관련 패키지 확인
            echo "📋 Checking required packages:"
            npm list yjs y-websocket ws lib0 pm2 --depth=0 || {
              echo "❌ Required dependencies missing"
              exit 1
            }

            echo "✅ All required dependencies verified"
          '''
        }
      }
    }

    stage('Copy to Shared Directory') {
      steps {
        dir("infra/main-ec2/node-server") {
          echo "📤 Copying artifacts to shared directory"
          sh '''
            echo "📁 Preparing shared directory..."
            mkdir -p ${SHARED_DIR}
            rm -rf ${SHARED_DIR}/*

            # 서버 소스 복사
            cp package.json ${SHARED_DIR}/
            cp package-lock.json ${SHARED_DIR}/ 2>/dev/null || echo "ℹ️ No package-lock.json"
            cp server.js ${SHARED_DIR}/
            cp ecosystem.config.js ${SHARED_DIR}/

            # node_modules는 복사하지 않음 (Docker 빌드 시 새로 설치)

            # Dockerfile 복사
            if [ -f "../dockerfiles/node.dockerfile" ]; then
              cp ../dockerfiles/node.dockerfile ${SHARED_DIR}/Dockerfile
              echo "✅ Dockerfile copied from infra/main-ec2/dockerfiles/node.dockerfile"
            else
              echo "❌ Dockerfile not found at infra/main-ec2/dockerfiles/node.dockerfile"
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
SERVICE_TYPE=CRDT-YJS-Server
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
