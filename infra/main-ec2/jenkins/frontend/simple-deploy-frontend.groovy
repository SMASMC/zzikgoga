pipeline {
    agent any

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'fe/master', description: '빌드할 브랜치')
        string(name: 'INFRA_BRANCH', defaultValue: 'infra/master', description: 'infra 브랜치')
    }

    environment {
        FE_DIR = 'zzik-front'
        FE_CHECKOUT_DIR = 'workspace-frontend'
        INFRA_CHECKOUT_DIR = 'workspace-infra'
        DEPLOY_DIR = '/var/www/zzik-frontend'
    }

    tools {
        nodejs "NodeJS-22"
    }

    stages {
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

                        sudo bash "${SCRIPT_PATH}" "$(pwd)/dist" "${NGINX_CONF}"
                    '''
                }
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    echo "🔍 배포 검증..."

                    if [ -f "${DEPLOY_DIR}/current/index.html" ]; then
                        echo "✅ index.html 확인됨"
                        FILE_COUNT=$(find ${DEPLOY_DIR}/current -type f | wc -l)
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
                if [ -d "${DEPLOY_DIR}/previous" ]; then
                    sudo rm -rf ${DEPLOY_DIR}/current
                    sudo mv ${DEPLOY_DIR}/previous ${DEPLOY_DIR}/current
                    sudo systemctl reload nginx
                    echo "🔄 롤백 완료"
                fi
            '''
        }
        always {
            sh 'rm -f ${FE_CHECKOUT_DIR}/${FE_DIR}/.env || true'
            cleanWs()
        }
    }
}
