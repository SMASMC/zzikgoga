const http = require('http');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const PORT = process.env.YJS_PORT || process.env.PORT || 3000;
const ENV_COLOR = process.env.ENV_COLOR || 'unknown';

// CORS 허용 도메인 설정
const ALLOWED_ORIGINS = [
  'https://zzik.kr',
  'https://www.zzik.kr',
  'https://api.zzik.kr',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
];

// HTTP 서버 생성
const server = http.createServer((req, res) => {
  const origin = req.headers.origin;

  // CORS 헤더 설정
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // OPTIONS preflight 처리
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check 엔드포인트
  if (req.url === '/health' || req.url === '/health-check') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      service: 'zzikgoga-crdt-server',
      environment: ENV_COLOR,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port: PORT
    }));
    return;
  }

  // Status 엔드포인트
  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      environment: ENV_COLOR,
      version: '1.0.0',
      nodeVersion: process.version
    }));
    return;
  }

  // Root 엔드포인트
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`CRDT WebSocket Server (${ENV_COLOR}) - Running on port ${PORT}`);
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// WebSocket 서버 생성
const wss = new WebSocketServer({
  server,
  // WebSocket CORS 설정
  verifyClient: (info) => {
    const origin = info.origin;
    // Origin이 없거나 허용된 도메인인 경우 연결 허용
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return true;
    }
    console.log(`Rejected WebSocket connection from: ${origin}`);
    return false;
  }
});

// WebSocket 연결 처리
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin || 'unknown';
  console.log(`[${new Date().toISOString()}] WebSocket connected from: ${origin}`);

  setupWSConnection(ws, req, {
    // y-websocket 옵션
    gc: true // 가비지 컬렉션 활성화
  });

  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] WebSocket disconnected from: ${origin}`);
  });

  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error from ${origin}:`, error);
  });
});

// 서버 시작
server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 ZZIKGOGA CRDT Server Started');
  console.log('='.repeat(60));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🎨 Environment: ${ENV_COLOR}`);
  console.log(`🌐 Allowed Origins: ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
