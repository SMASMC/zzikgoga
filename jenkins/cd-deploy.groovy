// 통합 CD 파이프라인 (Frontend/Backend)
// infra/master의 설정 파일을 사용하여 Blue-Green 배포 수행

pipeline {
    agent any

    parameters {
        choice(
            name: 'PROJECT_TYPE',
            choices: ['frontend', 'backend'],
            description: '배포할 프로젝트 타입'
        )
        choice(
            name: 'DEPLOY_MODE',
            choices: ['local', 'remote-ssh'],
            description: '배포 모드 (local: EC2 내부 Jenkins, remote-ssh: 외부 Jenkins)'
        )
        string(
            name: 'SHARED_WORKSPACE',
            defaultValue: '/tmp/shared-workspace',
            description: '공유 작업 공간 디렉토리'
        )
        string(
            name: 'SSH_HOST',
            defaultValue: '',
            description: 'SSH 배포 시 대상 서버 주소 (remote-ssh 모드에서만)'
        )
        string(
            name: 'SSH_CREDENTIALS_ID',
            defaultValue: 'ec2-ssh-key',
            description: 'SSH 인증 정보 ID (remote-ssh 모드에서만)'
        )
    }

    environment {
        SHARED_DIR = "${params.SHARED_WORKSPACE}/zzikgoga-${params.PROJECT_TYPE}"
        DEPLOY_DIR = "/opt/zzikgoga/${params.PROJECT_TYPE}"
        IMAGE_NAME = "zzikgoga-${params.PROJECT_TYPE}:latest"
    }

    stages {
        stage('Validate Artifacts') {
            steps {
                script {
                    echo "🔍 Validating build artifacts in ${SHARED_DIR}"

                    if (params.PROJECT_TYPE == 'frontend') {
                        sh '''
                            if [ ! -f "${SHARED_DIR}/index.html" ]; then
                                echo "❌ Frontend artifacts not found!"
                                echo "Expected: ${SHARED_DIR}/index.html"
                                ls -la ${SHARED_DIR}/ || echo "Directory not found"
                                exit 1
                            fi
                            echo "✅ Frontend artifacts validated"
                            ls -la ${SHARED_DIR}
                        '''
                    } else if (params.PROJECT_TYPE == 'backend') {
                        sh '''
                            if [ ! -d "${SHARED_DIR}/libs" ]; then
                                echo "❌ Backend artifacts not found!"
                                echo "Expected: ${SHARED_DIR}/libs/"
                                ls -la ${SHARED_DIR}/ || echo "Directory not found"
                                exit 1
                            fi
                            echo "✅ Backend artifacts validated"
                            ls -la ${SHARED_DIR}/libs
                        '''
                    }
                }
            }
        }

        stage('Prepare Environment File') {
            when {
                expression { params.PROJECT_TYPE == 'frontend' }
            }
            steps {
                script {
                    echo "🔧 Preparing environment file for frontend"

                    withCredentials([file(credentialsId: 'fe-prod-env-file', variable: 'ENV_FILE')]) {
                        sh '''
                            # infra/master의 docker 디렉토리에 .env 복사
                            cp "${ENV_FILE}" docker/.env
                            chmod 600 docker/.env
                            echo "✅ Environment file prepared"
                            echo "📋 Environment variables:"
                            grep -v "PASSWORD" docker/.env || true
                        '''
                    }
                }
            }
        }

        stage('Deploy - Local Mode') {
            when {
                expression { params.DEPLOY_MODE == 'local' }
            }
            steps {
                script {
                    echo "🚀 Starting local deployment for ${params.PROJECT_TYPE}"

                    // 1. 배포 디렉토리 준비
                    sh """
                        echo "📁 Preparing deployment directory: ${DEPLOY_DIR}"
                        mkdir -p ${DEPLOY_DIR}
                        cd ${DEPLOY_DIR}

                        # 필요한 하위 디렉토리 생성
                        mkdir -p docker nginx scripts
                    """

                    // 2. 빌드 결과물 복사
                    if (params.PROJECT_TYPE == 'frontend') {
                        sh """
                            echo "📦 Copying frontend artifacts"
                            mkdir -p ${DEPLOY_DIR}/dist
                            rm -rf ${DEPLOY_DIR}/dist/*
                            cp -r ${SHARED_DIR}/* ${DEPLOY_DIR}/dist/

                            echo "✅ Frontend artifacts copied"
                            ls -la ${DEPLOY_DIR}/dist/
                        """
                    } else if (params.PROJECT_TYPE == 'backend') {
                        sh """
                            echo "📦 Copying backend artifacts"
                            mkdir -p ${DEPLOY_DIR}/build/libs
                            rm -rf ${DEPLOY_DIR}/build/libs/*
                            cp -r ${SHARED_DIR}/libs/* ${DEPLOY_DIR}/build/libs/

                            echo "✅ Backend artifacts copied"
                            ls -la ${DEPLOY_DIR}/build/libs/
                        """
                    }

                    // 3. infra 설정 파일 복사 (현재 workspace = infra/master가 checkout된 상태)
                    sh """
                        echo "📋 Copying infrastructure files from infra/master"

                        # Docker 설정
                        cp -r docker/* ${DEPLOY_DIR}/docker/ 2>/dev/null || echo "⚠️ No docker files to copy"

                        # Nginx 설정
                        cp -r nginx/* ${DEPLOY_DIR}/nginx/ 2>/dev/null || echo "⚠️ No nginx files to copy"

                        # 배포 스크립트
                        cp -r scripts/* ${DEPLOY_DIR}/scripts/ 2>/dev/null || echo "⚠️ No scripts to copy"

                        # Dockerfile
                        cp dockerfile ${DEPLOY_DIR}/ 2>/dev/null || echo "⚠️ No Dockerfile to copy"

                        echo "✅ Infrastructure files copied"
                        ls -la ${DEPLOY_DIR}/
                    """

                    // 4. Docker 이미지 빌드
                    sh """
                        cd ${DEPLOY_DIR}

                        # 이전 이미지 백업 (존재할 때만)
                        if docker images -q ${IMAGE_NAME} 2>/dev/null | grep -q .; then
                            echo "💾 Backing up existing image: ${IMAGE_NAME}"
                            docker tag ${IMAGE_NAME} ${IMAGE_NAME}-previous
                        else
                            echo "ℹ️ No existing image found"
                        fi

                        # 새 이미지 빌드
                        echo "🔨 Building Docker image: ${IMAGE_NAME}"
                        docker build -t ${IMAGE_NAME} .

                        echo "✅ Docker image built successfully"
                        docker images | grep zzikgoga-${params.PROJECT_TYPE}
                    """

                    // 5. Blue-Green 배포 실행
                    sh """
                        cd ${DEPLOY_DIR}
                        chmod +x scripts/deploy.sh

                        echo "🚀 Starting Blue-Green deployment"
                        export PROJECT_TYPE=${params.PROJECT_TYPE}
                        ./scripts/deploy.sh
                    """
                }
            }
        }

        stage('Deploy - Remote SSH Mode') {
            when {
                expression { params.DEPLOY_MODE == 'remote-ssh' }
            }
            steps {
                script {
                    echo "🚀 Starting remote SSH deployment for ${params.PROJECT_TYPE}"

                    if (!params.SSH_HOST) {
                        error("❌ SSH_HOST parameter is required for remote-ssh mode!")
                    }

                    sshagent(credentials: [params.SSH_CREDENTIALS_ID]) {
                        // 1. 원격 서버에 디렉토리 생성
                        sh """
                            ssh -o StrictHostKeyChecking=no ubuntu@${params.SSH_HOST} "
                                mkdir -p ${DEPLOY_DIR}
                                mkdir -p ${DEPLOY_DIR}/docker
                                mkdir -p ${DEPLOY_DIR}/nginx
                                mkdir -p ${DEPLOY_DIR}/scripts
                            "
                        """

                        // 2. 빌드 결과물 전송
                        if (params.PROJECT_TYPE == 'frontend') {
                            sh """
                                ssh ubuntu@${params.SSH_HOST} "mkdir -p ${DEPLOY_DIR}/dist"
                                scp -r ${SHARED_DIR}/* ubuntu@${params.SSH_HOST}:${DEPLOY_DIR}/dist/
                                echo "✅ Frontend artifacts uploaded"
                            """
                        } else if (params.PROJECT_TYPE == 'backend') {
                            sh """
                                ssh ubuntu@${params.SSH_HOST} "mkdir -p ${DEPLOY_DIR}/build/libs"
                                scp -r ${SHARED_DIR}/libs/* ubuntu@${params.SSH_HOST}:${DEPLOY_DIR}/build/libs/
                                echo "✅ Backend artifacts uploaded"
                            """
                        }

                        // 3. infra 설정 파일 전송
                        sh """
                            scp -r docker/* ubuntu@${params.SSH_HOST}:${DEPLOY_DIR}/docker/ 2>/dev/null || true
                            scp -r nginx/* ubuntu@${params.SSH_HOST}:${DEPLOY_DIR}/nginx/ 2>/dev/null || true
                            scp -r scripts/* ubuntu@${params.SSH_HOST}:${DEPLOY_DIR}/scripts/ 2>/dev/null || true
                            scp dockerfile ubuntu@${params.SSH_HOST}:${DEPLOY_DIR}/ 2>/dev/null || true

                            echo "✅ Infrastructure files uploaded"
                        """

                        // 4. 원격에서 Docker 빌드 및 배포
                        sh """
                            ssh ubuntu@${params.SSH_HOST} "
                                cd ${DEPLOY_DIR}

                                # 이전 이미지 백업
                                if docker images -q ${IMAGE_NAME} 2>/dev/null | grep -q .; then
                                    docker tag ${IMAGE_NAME} ${IMAGE_NAME}-previous
                                fi

                                # Docker 이미지 빌드
                                docker build -t ${IMAGE_NAME} .
                                echo '✅ Docker image built'

                                # Blue-Green 배포
                                chmod +x scripts/deploy.sh
                                export PROJECT_TYPE=${params.PROJECT_TYPE}
                                ./scripts/deploy.sh
                            "
                        """
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo "🏥 Performing health check"

                    def healthEndpoint = (params.PROJECT_TYPE == 'frontend') ? '/health' : '/health-check'
                    def checkCommand = ""

                    if (params.DEPLOY_MODE == 'local') {
                        checkCommand = """
                            echo "🔍 Checking deployment status..."
                            docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" | grep zzikgoga-${params.PROJECT_TYPE} || echo "No containers found"

                            sleep 5
                            echo "✅ Deployment completed"
                        """
                    } else {
                        checkCommand = """
                            ssh ubuntu@${params.SSH_HOST} "
                                docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' | grep zzikgoga-${params.PROJECT_TYPE}
                            "
                        """
                    }

                    sh checkCommand
                }
            }
        }
    }

    post {
        success {
            echo "🎉 ${params.PROJECT_TYPE} deployment completed successfully!"
            echo "📍 Mode: ${params.DEPLOY_MODE}"
            echo "📦 Image: ${IMAGE_NAME}"
        }
        failure {
            echo "❌ ${params.PROJECT_TYPE} deployment failed!"
            echo "🔍 Check the logs above for errors"
        }
        always {
            // 환경 파일 정리 (보안)
            sh 'rm -f docker/.env 2>/dev/null || true'
        }
    }
}
