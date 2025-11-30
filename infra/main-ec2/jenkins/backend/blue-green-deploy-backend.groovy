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

                # 활성 컨테이너 확인 (blue 또는 green)
                if docker ps --format '{{.Names}}' | grep -qx 'zzikgoga-blue'; then
                    ACTIVE_CONTAINER="zzikgoga-blue"
                elif docker ps --format '{{.Names}}' | grep -qx 'zzikgoga-green'; then
                    ACTIVE_CONTAINER="zzikgoga-green"
                else
                    echo "❌ No active backend container found"
                    exit 1
                fi
                echo "✅ Active container: $ACTIVE_CONTAINER"

                # zzik-nginx 컨테이너 내부에서 헬스 체크 (Docker 네트워크 사용)
                OK=1
                for p in /api/health-check /health-check /api/; do
                  code=$(docker exec zzik-nginx wget -qO- --timeout=5 -S "http://${ACTIVE_CONTAINER}:8080${p}" 2>&1 | grep -o "HTTP/[0-9.]* [0-9]*" | head -1 | awk '{print $2}' || echo 000)
                  if [ -z "$code" ]; then
                    code=$(curl -s -o /dev/null -w '%{http_code}' "http://${ACTIVE_CONTAINER}:8080${p}" 2>/dev/null || echo 000)
                  fi
                  echo "probe ${p} -> ${code}"
                  case "$code" in 2*|3*|4*) OK=0; break;; esac
                done
                if [ $OK -ne 0 ]; then
                  echo "Backend not responding on ${ACTIVE_CONTAINER}:8080"
                  exit 1
                fi
                echo "✅ Backend health check passed"
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
                        # deploy-backend.sh already handles grafana/prometheus
                        # Only deploy loki/promtail here
                        docker compose -p main-ec2-monitoring -f docker-compose.monitoring.yml up -d loki promtail
                    '''
                }
            }
            sh '''
              docker cp infra/main-ec2/monitoring/nginx/monitoring.conf zzik-nginx:/etc/nginx/conf.d/monitoring.zzik.kr.conf || true
              docker exec zzik-nginx nginx -t && docker exec zzik-nginx nginx -s reload
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
