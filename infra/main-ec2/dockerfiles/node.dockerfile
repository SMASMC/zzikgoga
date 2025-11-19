FROM node:22.16-alpine

# Timezone 설정
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone && \
    apk del tzdata

# 작업 디렉토리 설정
WORKDIR /app
ENV PORT=3100

# 보안을 위한 non-root 사용자 생성
RUN addgroup -S nodeapp || true
RUN adduser -S -G nodeapp nodeapp || true

# package.json 복사 및 dependencies 설치
COPY package*.json ./
RUN npm ci --only=production --quiet && \
    npm cache clean --force

# 빌드된 소스 코드 복사 (dist/)
COPY dist/ ./dist/

# 환경 설정 파일 복사 (선택적)
COPY build-info.txt ./build-info.txt

# 로그 디렉토리 생성
RUN mkdir -p logs

# 소유권 변경
RUN chown -R nodeapp:nodeapp /app

# non-root 사용자로 전환
USER nodeapp

# 포트 노출
EXPOSE 3100

# Health check (빌드된 JS 파일 실행)
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

# 빌드된 서버 실행
CMD ["node", "dist/server.js"]
