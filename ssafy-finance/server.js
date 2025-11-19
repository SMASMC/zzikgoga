const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// CORS 설정
app.use(cors());
app.use(express.json());

// 정적 파일 제공 (HTML, CSS, JS)
app.use(express.static(__dirname));

// Header 생성 함수
function generateHeader(apiName) {
    const now = new Date();

    // YYYYMMDD 형식
    const transmissionDate = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');

    // HHMMSS 형식
    const transmissionTime = String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

    // 기관거래고유번호 생성: YYYYMMDD + HHMMSS + 일련번호 6자리
    const serialNumber = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    const institutionTransactionUniqueNo = transmissionDate + transmissionTime + serialNumber;

    return {
        apiName: apiName,
        transmissionDate: transmissionDate,
        transmissionTime: transmissionTime,
        institutionCode: '00100',
        fintechAppNo: '001',
        apiServiceCode: apiName,
        institutionTransactionUniqueNo: institutionTransactionUniqueNo,
        apiKey: process.env.API_KEY,
        userKey: process.env.USER_KEY
    };
}

// 계좌 잔액 조회 API
app.post('/api/balance', async (req, res) => {
    try {
        const { accountNo } = req.body;

        const requestBody = {
            Header: generateHeader('inquireDemandDepositAccountBalance'),
            accountNo: accountNo
        };

        const targetUrl = `${process.env.BASE_URL}/demandDeposit/inquireDemandDepositAccountBalance`;

        console.log('[PROXY] 잔액 조회 요청:', targetUrl);
        console.log('[PROXY] 요청 본문:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('[PROXY] 응답 상태:', response.status);
        console.log('[PROXY] 응답 데이터:', JSON.stringify(data, null, 2));

        res.json(data);
    } catch (error) {
        console.error('[PROXY] 잔액 조회 오류:', error);
        res.status(500).json({
            error: '프록시 서버 오류',
            message: error.message
        });
    }
});

// 거래 내역 조회 API
app.post('/api/transactions', async (req, res) => {
    try {
        const { accountNo, startDate, endDate } = req.body;

        const requestBody = {
            Header: generateHeader('inquireTransactionHistoryList'),
            accountNo: accountNo,
            startDate: startDate,
            endDate: endDate,
            transactionType: 'A',
            orderByType: 'ASC'
        };

        const targetUrl = `${process.env.BASE_URL}/demandDeposit/inquireTransactionHistoryList`;

        console.log('[PROXY] 거래 내역 조회 요청:', targetUrl);
        console.log('[PROXY] 요청 본문:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        console.log('[PROXY] 응답 상태:', response.status);
        console.log('[PROXY] 응답 데이터:', JSON.stringify(data, null, 2));

        res.json(data);
    } catch (error) {
        console.error('[PROXY] 거래 내역 조회 오류:', error);
        res.status(500).json({
            error: '프록시 서버 오류',
            message: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   SSAFY Finance Proxy Server                  ║
╚════════════════════════════════════════════════╝

🚀 서버 실행 중: http://localhost:${PORT}
📁 정적 파일 제공: ${__dirname}
🔐 환경 변수 로드됨:
   - API_KEY: ${process.env.API_KEY ? '✓ 설정됨' : '✗ 없음'}
   - USER_KEY: ${process.env.USER_KEY ? '✓ 설정됨' : '✗ 없음'}
   - BASE_URL: ${process.env.BASE_URL || '✗ 없음'}

브라우저에서 http://localhost:${PORT} 로 접속하세요.
    `);
});
