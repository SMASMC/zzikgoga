// 통합 CI 파이프라인 (Frontend/Backend)
// Generic Webhook Trigger로 실행됨
// fe/master 또는 be/master에서 소스를 checkout하여 빌드

pipeline {
    agent any

    parameters {
        choice(
            name: 'PROJECT_TYPE',
            choices: ['frontend', 'backend'],
            description: '빌드할 프로젝트 타입'
        )
        string(
            name: 'BRANCH_NAME',
            defaultValue: 'fe/master',
            description: '빌드할 브랜치 (fe/master 또는 be/master)'
        )
        string(
            name: 'REPO_URL',
            defaultValue: '',
            description: 'Git 저장소 URL (GitLab Webhook에서 자동 전달)'
        )
        string(
            name: 'SHARED_WORKSPACE',
            defaultValue: '/tmp/shared-workspace',
            description: '공유 작업 공간 디렉토리'
        )
    }

    environment {
        SHARED_DIR = "${params.SHARED_WORKSPACE}/zzikgoga-${params.PROJECT_TYPE}"
        NODEJS_HOME = '/usr/bin'
        JAVA_HOME = '/usr/lib/jvm/java-21-openjdk-amd64'
    }

    stages {
        stage('Checkout Source') {
            steps {
                script {
                    echo "🔍 Checking out ${params.PROJECT_TYPE} from ${params.BRANCH_NAME}"
                    echo "📦 Repository: ${params.REPO_URL}"

                    // 소스 저장소 체크아웃 (fe/master 또는 be/master)
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "*/${params.BRANCH_NAME}"]],
                        userRemoteConfigs: [[url: params.REPO_URL]]
                    ])

                    echo "✅ Source code checked out successfully"
                }
            }
        }

        stage('Setup Environment') {
            steps {
                script {
                    if (params.PROJECT_TYPE == 'frontend') {
                        echo "🔧 Setting up Node.js environment"
                        sh '''
                            node --version
                            npm --version
                        '''
                    } else if (params.PROJECT_TYPE == 'backend') {
                        echo "🔧 Setting up Java environment"
                        sh '''
                            export PATH=${JAVA_HOME}/bin:${PATH}
                            java -version
                            ./gradlew --version || echo "Gradle wrapper not found"
                        '''
                    }
                }
            }
        }

        stage('Install Dependencies') {
            when {
                expression { params.PROJECT_TYPE == 'frontend' }
            }
            steps {
                echo "📦 Installing npm dependencies"
                sh '''
                    npm ci
                    echo "✅ Dependencies installed"
                '''
            }
        }

        stage('Build') {
            steps {
                script {
                    if (params.PROJECT_TYPE == 'frontend') {
                        echo "🔨 Building Vite React application"
                        sh '''
                            npm run build
                            echo "✅ Vite build completed"
                            echo "📂 Build output:"
                            ls -lah dist/
                        '''
                    } else if (params.PROJECT_TYPE == 'backend') {
                        echo "🔨 Building Spring Boot application"
                        sh '''
                            export PATH=${JAVA_HOME}/bin:${PATH}
                            chmod +x ./gradlew
                            ./gradlew clean build --refresh-dependencies --no-build-cache
                            echo "✅ Gradle build completed"
                            echo "📂 Build output:"
                            ls -lah build/libs/
                        '''
                    }
                }
            }
        }

        stage('Copy to Shared Directory') {
            steps {
                script {
                    echo "📤 Copying build artifacts to shared directory: ${SHARED_DIR}"
                    sh '''
                        mkdir -p ${SHARED_DIR}
                        rm -rf ${SHARED_DIR}/*
                    '''

                    if (params.PROJECT_TYPE == 'frontend') {
                        sh '''
                            # dist 폴더 내용을 공유 디렉토리로 복사
                            cp -r dist/* ${SHARED_DIR}/

                            # 빌드 정보 저장
                            cat > ${SHARED_DIR}/build-info.txt << EOF
BUILD_TYPE=frontend
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')
BRANCH_NAME=${BRANCH_NAME}
BUILD_NUMBER=${BUILD_NUMBER}
GIT_COMMIT=${GIT_COMMIT}
EOF
                            echo "✅ Frontend artifacts copied to ${SHARED_DIR}"
                            ls -la ${SHARED_DIR}
                        '''
                    } else if (params.PROJECT_TYPE == 'backend') {
                        sh '''
                            # build/libs 폴더를 공유 디렉토리로 복사
                            cp -r build/libs ${SHARED_DIR}/

                            # 빌드 정보 저장
                            cat > ${SHARED_DIR}/build-info.txt << EOF
BUILD_TYPE=backend
BUILD_DATE=$(date '+%Y-%m-%d %H:%M:%S')
BRANCH_NAME=${BRANCH_NAME}
BUILD_NUMBER=${BUILD_NUMBER}
GIT_COMMIT=${GIT_COMMIT}
EOF
                            echo "✅ Backend artifacts copied to ${SHARED_DIR}"
                            ls -la ${SHARED_DIR}
                        '''
                    }
                }
            }
        }

        stage('Test Results') {
            steps {
                script {
                    if (params.PROJECT_TYPE == 'frontend') {
                        echo "⚠️ Frontend test results - implement if needed"
                    } else if (params.PROJECT_TYPE == 'backend') {
                        def testResults = findFiles(glob: 'build/test-results/test/*.xml')
                        if (testResults.length > 0) {
                            junit 'build/test-results/test/*.xml'
                            echo "✅ Test results processed"
                        } else {
                            echo "⚠️ No test results found - skipping test report"
                        }
                    }
                }
            }
        }
    }

    post {
        success {
            echo "🎉 ${params.PROJECT_TYPE} CI Build completed successfully!"
            echo "📦 Artifacts available at: ${SHARED_DIR}"
            echo "📋 Build Info:"
            sh "cat ${SHARED_DIR}/build-info.txt || true"
        }
        failure {
            echo "❌ ${params.PROJECT_TYPE} CI Build failed!"
            echo "🔍 Check the logs above for errors"
        }
        always {
            echo "🧹 Cleaning workspace (keeping shared artifacts)"
            cleanWs()
        }
    }
}
