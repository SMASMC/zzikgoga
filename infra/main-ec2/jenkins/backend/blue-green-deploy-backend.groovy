pipeline {
  agent any

  parameters {
    string(name: 'BE_ENV_CRED_ID', defaultValue: 'be-prod-env-file', description: 'Jenkins Credentials ID (file) for backend env')
    string(name: 'MONITORING_ENV_CRED_ID', defaultValue: 'monitoring-prod-env-file', description: 'Monitoring .env.monitoring credential ID')
    booleanParam(name: 'ENABLE_MONITORING_DEPLOY', defaultValue: true, description: 'Deploy monitoring (grafana/prometheus) if true')
  }

  environment {
    BLUE_COMPOSE = 'infra/main-ec2/docker-compose-backend-blue.yml'
    GREEN_COMPOSE = 'infra/main-ec2/docker-compose-backend-green.yml'
    DB_COMPOSE = 'infra/main-ec2/db/docker-compose.psql.yml'
    COMPOSE_PROJECT = 'main-ec2'
    IMAGE_NAME = "${params.SERVICE_NAME}:latest"
  }

  stages {
    stage('Prepare Environment') {
        steps {
            dir('infra/main-ec2') {
                withCredentials([file(credentialsId: 'be-prod-env-file', variable: 'ENV_FILE')]) {
                    sh '''
                        cp "${ENV_FILE}" .env
                        chmod 600 .env
                        echo "✅ Environment file prepared"
                    '''
                }
            }
        }
    }

    stage('Blue-Green Deploy') {
        steps {
            dir('infra/main-ec2') {
                sh '''
                    chmod +x scripts/deploy-backend.sh
                    scripts/deploy-backend.sh
                '''
            }
        }
    }

    stage('Health Check') {
        steps {
            sh '''
                echo "🔍 Final deployment status:"
                docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}" | grep zzikgoga

                # 활성 포트 확인
                ACTIVE_PORT=$(grep -E "^\\s*server\\s+localhost:" /etc/nginx/sites-enabled/api.zzik.kr | awk -F: '{print $2}' | tr -d ';' | head -n1)
                echo "✅ Active port: $ACTIVE_PORT"

                # 헬스 체크
                OK=1
                for p in /health-check /api/health-check /; do
                  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${ACTIVE_PORT}${p}" || echo 000)
                  echo "probe ${p} -> ${code}"
                  case "$code" in 2*|3*|4*) OK=0; break;; esac
                done
                if [ $OK -ne 0 ]; then
                  echo "Backend not responding on ${ACTIVE_PORT}"
                  exit 1
                fi
            '''
        }
    }

    stage('Monitoring Deploy (optional)') {
        when { expression { return params.ENABLE_MONITORING_DEPLOY } }
        steps {
            dir('infra/main-ec2/monitoring') {
                withCredentials([file(credentialsId: params.MONITORING_ENV_CRED_ID, variable: 'ENV_FILE')]) {
                    sh '''
                        # copy monitoring env only if not present or content differs
                        if [ ! -f .env.monitoring ] || ! cmp -s "${ENV_FILE}" .env.monitoring; then
                          cp "${ENV_FILE}" .env.monitoring
                          chmod 600 .env.monitoring || true
                          echo "[monitoring] env prepared"
                        else
                          echo "[monitoring] env already up to date"
                        fi
                        docker compose -p main-ec2-monitoring -f docker-compose.monitoring.yml up -d grafana prometheus
                    '''
                }
            }
            sh '''
              sudo ln -sf /etc/nginx/sites-available/monitoring.zzik.kr /etc/nginx/sites-enabled/monitoring.zzik.kr
              sudo nginx -t && sudo systemctl reload nginx
            '''
        }
    }
  }

    post {
        success {
            echo "🎉 Deployment completed successfully!"
        }
        failure {
            echo "❌ Deployment failed!"
        }
        always {
            sh 'rm -f infra/main-ec2/.env || true'
        }
    }
}
