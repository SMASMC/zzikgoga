pipeline {
    agent any
    triggers {
        githubPush()  // GitHub webhook으로 자동 트리거
    }

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'fe/master', description: '빌드할 브랜치')
        string(name: 'INFRA_BRANCH', defaultValue: 'infra/master', description: 'infra 브랜치')
    }

    environment {
        FE_DIR = 'zzik-front'
        FE_CHECKOUT_DIR = 'workspace-frontend'
        INFRA_CHECKOUT_DIR = 'workspace-infra'
        DEPLOY_DIR = '/var/www/zzik-frontend'
        TARGET_BRANCH = 'fe/master'
    }

    tools {
        nodejs "NodeJS-22"
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
                    def allowedBranches = [
                        env.TARGET_BRANCH,
                        params.BRANCH_NAME,
                        params.INFRA_BRANCH
                    ].findAll { it }
                    if (pushedBranch && !allowedBranches.contains(pushedBranch)) {
                        echo "⏭️ Skipping: branch '${pushedBranch}' not in allowed branches: ${allowedBranches.join(', ')}"
                        currentBuild.result = 'NOT_BUILT'
                        error("Branch mismatch")
                    }
                    echo "✅ Branch filter passed"
                }
            }
        }

        stage('Checkout') {
            steps {
                withCredentials([string(credentialsId: 'zzikgoga-github-url', variable: 'GIT_REPO_URL')]) {
                    dir("${INFRA_CHECKOUT_DIR}") {
                        deleteDir()
                        checkout([
                            $class: 'GitSCM',
                            branches: [[name: "origin/${params.INFRA_BRANCH}"]],
                            userRemoteConfigs: [[
                                url: env.GIT_REPO_URL,
                                credentialsId: 'github-smasmc-token'
                            ]],
                            extensions: [
                                [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [
                                    [path: 'infra/**']
                                ]]
                            ]
                        ])
                    }

                    dir("${FE_CHECKOUT_DIR}") {
                        deleteDir()
                        checkout([
                            $class: 'GitSCM',
                            branches: [[name: "origin/${params.BRANCH_NAME}"]],
                            userRemoteConfigs: [[
                                url: env.GIT_REPO_URL,
                                credentialsId: 'github-smasmc-token'
                            ]],
                            extensions: [
                                [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [
                                    [path: 'zzik-front/**']
                                ]]
                            ]
                        ])
                    }
                }

                sh 'test -f ${FE_CHECKOUT_DIR}/${FE_DIR}/package.json || { echo "❌ package.json 없음"; exit 1; }'
            }
        }

        stage('Setup .env') {
            steps {
                withCredentials([file(credentialsId: "fe-prod-env-file", variable: 'ENV_FILE')]) {
                    dir("${FE_CHECKOUT_DIR}/${FE_DIR}") {
                        sh '''
                            cp "${ENV_FILE}" .env
                            chmod 600 .env
                            command -v dos2unix >/dev/null 2>&1 && dos2unix .env || true
                            sed -i 's/zzik[.]kr/zzik.store/g' .env
                            sed -i '/^VITE_KAKAO_REST_API_KEY=/d; /^VITE_KAKAO_JS_KEY=/d' .env
                            echo >> .env
                            printf '%s\n' 'VITE_KAKAO_REST_API_KEY=5e5f20af7c2f56164ee80f62f6d389f0' 'VITE_KAKAO_JS_KEY=eb6e23c73a69bdb5b1446adb926cabaa' >> .env
                            grep -q '^VITE_KAKAO_REST_API_KEY=5e5f20af7c2f56164ee80f62f6d389f0$' .env
                            grep -q '^VITE_KAKAO_JS_KEY=eb6e23c73a69bdb5b1446adb926cabaa$' .env
                            echo "✅ .env 준비 완료"
                        '''
                    }
                }
            }
        }

        stage('Install & Build') {
            steps {
                dir("${FE_CHECKOUT_DIR}/${FE_DIR}") {
                    nodejs(nodeJSInstallationName: "NodeJS-22") {
                        sh '''
                            echo "📦 의존성 설치..."
                            npm ci --cache .npm --prefer-offline

                            echo "🔍 Lint 검사..."
                            npm run lint

                            echo "🔨 빌드..."
                            npm run build

                            echo "✅ 빌드 완료: $(du -sh dist/)"
                        '''
                    }
                }
            }
        }

        stage('Deploy to Nginx') {
            steps {
                dir("${FE_CHECKOUT_DIR}/${FE_DIR}") {
                    sh '''
                        SCRIPT_PATH="${WORKSPACE}/${INFRA_CHECKOUT_DIR}/infra/main-ec2/scripts/deploy-frontend-static.sh"
                        NGINX_CONF="${WORKSPACE}/${INFRA_CHECKOUT_DIR}/infra/main-ec2/nginx/frontend.conf"

                        if [ ! -f "${SCRIPT_PATH}" ]; then
                            echo "[Deploy] Script not found: ${SCRIPT_PATH}"
                            exit 1
                        fi

                        command -v dos2unix >/dev/null 2>&1 && dos2unix "${SCRIPT_PATH}" || true
                        chmod +x "${SCRIPT_PATH}"

                        bash "${SCRIPT_PATH}" "$(pwd)/dist" "${NGINX_CONF}"
                    '''
                }
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    echo "🔍 배포 검증..."
                    NGINX_CONTAINER="zzik-nginx"
                    DEPLOY_PATH="/usr/share/nginx/zzik-frontend"

                    if docker exec ${NGINX_CONTAINER} test -f "${DEPLOY_PATH}/index.html"; then
                        echo "✅ index.html 확인됨"
                        FILE_COUNT=$(docker exec ${NGINX_CONTAINER} find ${DEPLOY_PATH} -type f | wc -l)
                        echo "📊 배포된 파일 수: ${FILE_COUNT}"
                    else
                        echo "❌ index.html 없음!"
                        exit 1
                    fi
                '''
            }
        }
    }

    post {
        success {
            echo "🎉 프론트엔드 배포 성공!"
        }
        failure {
            echo "❌ 배포 실패! 롤백 시도..."
            sh '''
                NGINX_CONTAINER="zzik-nginx"
                DEPLOY_PATH="/usr/share/nginx/zzik-frontend"

                docker exec ${NGINX_CONTAINER} sh -c "
                    if [ -d '${DEPLOY_PATH}.previous' ]; then
                        rm -rf ${DEPLOY_PATH}
                        mv ${DEPLOY_PATH}.previous ${DEPLOY_PATH}
                    fi
                " || true
                docker exec ${NGINX_CONTAINER} nginx -s reload || true
                echo "🔄 롤백 완료"
            '''
        }
        always {
            sh 'rm -f ${FE_CHECKOUT_DIR}/${FE_DIR}/.env || true'
            cleanWs()
        }
    }
}
