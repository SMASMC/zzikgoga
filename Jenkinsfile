pipeline {
    agent any

    environment {
        NODE_VERSION = '20'
        BUILD_DIR = 'dist'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    sh 'npm ci'
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    sh 'npm run build'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: "${BUILD_DIR}/**/*", fingerprint: true
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // 배포 스크립트 실행
                    // 예: Nginx 서버로 파일 복사, S3 업로드 등
                    sh '''
                        echo "Deploying to production..."
                        # rsync -avz --delete dist/ user@server:/var/www/html/
                        # 또는 S3 배포
                        # aws s3 sync dist/ s3://your-bucket-name/ --delete
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Build and deployment successful!'
        }
        failure {
            echo 'Build or deployment failed!'
        }
        cleanup {
            cleanWs()
        }
    }
}
