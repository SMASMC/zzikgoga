pipeline {
    agent any

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'master', description: '빌드할 브랜치')
        string(name: 'SHARED_WORKSPACE', defaultValue: '/tmp/shared-workspace', description: '공유 작업 공간 디렉토리')
        string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga', description: '서비스 이름')
    }

    environment {
        SHARED_DIR = "${params.SHARED_WORKSPACE}/${params.SERVICE_NAME}"
        JAVA_HOME = '/usr/lib/jvm/java-21-openjdk-amd64'
        PATH = "${JAVA_HOME}/bin:${PATH}"
    }

    stages {
        stage('Build') {
            steps {
                echo "🔨 Building Spring Boot application"
                sh '''
                    chmod +x ./gradlew
                    ./gradlew clean build --refresh-dependencies --no-build-cache --rerun-tasks
                '''
            }
        }

        stage('Copy to Shared Directory') {
            steps {
                echo "📤 Copying build artifacts to shared directory"
                sh '''
                    mkdir -p ${SHARED_DIR}
                    rm -rf ${SHARED_DIR}/*
                    cp -r build/libs ${SHARED_DIR}/

                    cat > ${SHARED_DIR}/build-info.txt << EOF
BUILD_DATE=$(date)
BRANCH_NAME=${BRANCH_NAME}
BUILD_NUMBER=${BUILD_NUMBER}
GIT_COMMIT=${GIT_COMMIT}
EOF
                '''
            }
        }

        stage('Test Results') {
            steps {
                script {
                    def testResults = findFiles(glob: 'build/test-results/test/*.xml')
                    if (testResults.length > 0) {
                        junit 'build/test-results/test/*.xml'
                    } else {
                        echo "⚠️ No test results found - skipping test report"
                    }
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
            cleanWs()
        }
    }
}
