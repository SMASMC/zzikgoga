pipeline {
    agent any

    triggers {
        githubPush()  // GitHub webhook으로 자동 트리거
    }

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'be/master', description: '빌드용 브랜치')
        string(name: 'SHARED_WORKSPACE', defaultValue: '/tmp/shared-workspace', description: '공유 작업 공간 디렉터리')
        string(name: 'SERVICE_NAME', defaultValue: 'zzikgoga', description: '서비스 이름(이미지/공유 디렉터리명)')
        string(name: 'JDK_TOOL_NAME', defaultValue: 'Java21', description: 'Jenkins JDK tool name (예: Java21)')
    }

    environment {
        SHARED_DIR = "${params.SHARED_WORKSPACE}/${params.SERVICE_NAME}"
        TARGET_BRANCH = 'be/master'
    }

    stages {
        stage('Branch Filter') {
            steps {
                script {
                    // 수동 빌드인지 확인 (UserIdCause가 있으면 수동)
                    def isManualBuild = currentBuild.getBuildCauses('hudson.model.Cause$UserIdCause').size() > 0
                    if (isManualBuild) {
                        echo "🔧 Manual build detected - skipping branch filter"
                        echo "✅ Branch filter passed (manual)"
                        return
                    }

                    // Webhook 트리거인 경우 브랜치 필터링
                    def pushedRef = env.GIT_BRANCH ?: ''
                    def pushedBranch = pushedRef.replaceAll('refs/heads/', '').replaceAll('origin/', '')
                    if (pushedBranch && pushedBranch != env.TARGET_BRANCH) {
                        echo "⏭️ Skipping: branch '${pushedBranch}' != '${env.TARGET_BRANCH}'"
                        currentBuild.result = 'NOT_BUILT'
                        error("Branch mismatch")
                    }
                    echo "✅ Branch filter passed"
                }
            }
        }

        stage('Checkout Backend') {
            steps {
                withCredentials([string(credentialsId: 'zzikgoga-github-url', variable: 'GIT_REPO_URL')]) {
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: "origin/${params.BRANCH_NAME}"]],
                        userRemoteConfigs: [[
                            url: env.GIT_REPO_URL,
                            credentialsId: 'github-smasmc-token'
                        ]],
                        extensions: [
                            [$class: 'CleanBeforeCheckout'],
                            [$class: 'RelativeTargetDirectory', relativeTargetDir: '.']
                        ]
                    ])
                }
                sh 'echo "Checked out ${BRANCH_NAME}" && ls -al'
            }
        }

        stage('Use Jenkins JDK 21') {
            steps {
                script {
                    try {
                        def jdkHome = tool name: params.JDK_TOOL_NAME, type: 'hudson.model.JDK'
                        env.JAVA_HOME = jdkHome
                        env.PATH = "${jdkHome}/bin:${env.PATH}"
                        echo "JAVA_HOME=${env.JAVA_HOME}"
                    } catch (e) {
                        echo "[WARN] Jenkins JDK tool not found: ${params.JDK_TOOL_NAME}. Falling back to system Java."
                    }
                }
                sh 'java -version || true'
            }
        }

        stage('Build') {
            steps {
                echo "🚀 Building Spring Boot application"
                sh '''
                    set -e
                    # Locate backend project (gradlew)
                    CANDIDATE=""
                    if [ -f gradlew ]; then CANDIDATE="."; fi
                    if [ -z "$CANDIDATE" ]; then CANDIDATE=$(find . -maxdepth 3 -type f -name gradlew | head -1 || true); fi
                    if [ -z "$CANDIDATE" ]; then echo "❌ gradlew not found"; exit 1; fi
                    PROJ_DIR=$(dirname "$CANDIDATE")
                    echo "Backend project dir: $PROJ_DIR"
                    cd "$PROJ_DIR"
                    chmod +x ./gradlew
                    ./gradlew clean build --refresh-dependencies --no-build-cache --rerun-tasks
                '''
            }
        }

        stage('Copy to Shared Directory') {
            steps {
                echo "📤 Copying build artifacts to shared directory"
                sh '''
                    set -e
                    # locate built libs
                    LIBS_DIR=""
                    if [ -d build/libs ]; then LIBS_DIR="build/libs"; fi
                    if [ -z "$LIBS_DIR" ]; then LIBS_DIR=$(find . -maxdepth 4 -type d -path '*/build/libs' | head -1 || true); fi
                    if [ -z "$LIBS_DIR" ]; then echo "❌ build/libs not found"; exit 1; fi
                    echo "libs: $LIBS_DIR"
                    mkdir -p ${SHARED_DIR}
                    rm -rf ${SHARED_DIR}/*
                    cp -r "$LIBS_DIR" ${SHARED_DIR}/

                    # Provide Dockerfile for docker-build job
                    if [ -f "infra/main-ec2/dockerfiles/be.dockerfile" ]; then
                        cp infra/main-ec2/dockerfiles/be.dockerfile ${SHARED_DIR}/Dockerfile
                    fi

                    cat > ${SHARED_DIR}/build-info.txt << BUILDEOF
BUILD_DATE=$(date)
BRANCH_NAME=${BRANCH_NAME}
BUILD_NUMBER=${BUILD_NUMBER}
GIT_COMMIT=${GIT_COMMIT}
BUILDEOF
                '''
            }
        }
    }

    post {
        success { echo '✅ CI Build completed successfully!' }
        failure { echo '❌ CI Build failed!' }
        always { cleanWs() }
    }
}
