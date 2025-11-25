pipeline {
    agent any

    parameters {
        string(name: 'BRANCH_NAME', defaultValue: 'fe/master', description: '빌드할 브랜치')
    }

    environment {
        FE_DIR = 'zzik-front'
        DEPLOY_DIR = '/var/www/zzik-frontend'
    }

    tools {
        nodejs "NodeJS-22"
    }

    stages {
        stage('Checkout') {
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
                        [$class: 'SparseCheckoutPaths', sparseCheckoutPaths: [
                            [path: 'zzik-front/**'],
                            [path: 'infra/main-ec2/nginx/**']
                        ]]
                    ]
                ])
                sh 'test -f zzik-front/package.json || { echo "❌ package.json 없음"; exit 1; }'
            }
        }

        stage('Setup .env') {
            steps {
                withCredentials([file(credentialsId: "fe-prod-env-file", variable: 'ENV_FILE')]) {
                    dir("${FE_DIR}") {
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
                dir("${FE_DIR}") {
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
                dir("${FE_DIR}") {
                    sh '''
                        echo "🚀 Nginx에 배포..."

                        # 배포 디렉토리 준비
                        sudo mkdir -p ${DEPLOY_DIR}

                        # 기존 파일 백업 (롤백용)
                        if [ -d "${DEPLOY_DIR}/current" ]; then
                            sudo rm -rf ${DEPLOY_DIR}/previous
                            sudo mv ${DEPLOY_DIR}/current ${DEPLOY_DIR}/previous
                            echo "📦 이전 버전 백업 완료"
                        fi

                        # 새 빌드 배포
                        sudo mkdir -p ${DEPLOY_DIR}/current
                        sudo cp -r dist/* ${DEPLOY_DIR}/current/

                        # 빌드 정보 기록
                        echo "BUILD_DATE=$(date)" | sudo tee ${DEPLOY_DIR}/current/build-info.txt
                        echo "BRANCH=${BRANCH_NAME}" | sudo tee -a ${DEPLOY_DIR}/current/build-info.txt
                        echo "BUILD_NUMBER=${BUILD_NUMBER}" | sudo tee -a ${DEPLOY_DIR}/current/build-info.txt

                        # 권한 설정
                        sudo chown -R www-data:www-data ${DEPLOY_DIR}/current
                        sudo chmod -R 755 ${DEPLOY_DIR}/current

                        echo "✅ 파일 복사 완료"
                    '''
                }
            }
        }

        stage('Update Nginx Config') {
            steps {
                sh '''
                    echo "⚙️ Nginx 설정 업데이트..."

                    # frontend-static.conf 적용
                    if [ -f "infra/main-ec2/nginx/frontend-static.conf" ]; then
                        sudo cp infra/main-ec2/nginx/frontend-static.conf /etc/nginx/sites-available/zzik.kr
                        sudo ln -sf /etc/nginx/sites-available/zzik.kr /etc/nginx/sites-enabled/zzik.kr
                        echo "✅ Nginx 설정 복사 완료"
                    fi

                    # Nginx 테스트 및 재로드
                    sudo nginx -t && sudo systemctl reload nginx
                    echo "✅ Nginx 재로드 완료"
                '''
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
            sh 'rm -f ${FE_DIR}/.env || true'
            cleanWs()
        }
    }
}
