FROM node:22.16-alpine

# Timezone 설정
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apk del tzdata

# 작업 디렉토리 설정
WORKDIR /app

# 보안을 위한 non-root 사용자 생성
RUN addgroup -g 1000 nodeapp && \
    adduser -D -u 1000 -G nodeapp nodeapp

# package.json 복사 및 dependencies 설치
COPY package*.json ./
RUN npm ci --omit=dev --quiet && \
    npm cache clean --force

# PM2 ecosystem 설정 및 server.js 복사
COPY ecosystem.config.js ./
COPY server.js ./
COPY build-info.txt ./build-info.txt

# PM2 로그 디렉토리 생성
RUN mkdir -p logs

# 소유권 변경
RUN chown -R nodeapp:nodeapp /app

# non-root 사용자로 전환
USER nodeapp

# 포트 노출
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# PM2로 서버 실행 (pm2-runtime은 foreground 모드로 실행되어 Docker 컨테이너가 종료되지 않음)
CMD ["npm", "start"]
