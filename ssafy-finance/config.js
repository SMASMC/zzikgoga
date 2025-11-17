// 계좌 잔액 조회
async function inquireBalance(accountNo) {
    try {
        const url = '/api/balance';
        console.log('[API] 잔액 조회 요청 (프록시):', url);
        console.log('[API] 계좌번호:', accountNo);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accountNo })
        });

        console.log('[API] 응답 상태:', response.status, response.statusText);

        const data = await response.json();
        console.log('[API] 응답 데이터:', data);

        return data;
    } catch (error) {
        console.error('[API] 잔액 조회 오류:', error);
        console.error('[API] 오류 상세:', error.message);
        throw error;
    }
}

// 이체 내역 조회
async function inquireTransactionHistory(accountNo, startDate, endDate) {
    try {
        const url = '/api/transactions';
        console.log('[API] 거래 내역 조회 요청 (프록시):', url);
        console.log('[API] 요청 데이터:', { accountNo, startDate, endDate });

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accountNo, startDate, endDate })
        });

        console.log('[API] 응답 상태:', response.status, response.statusText);

        const data = await response.json();
        console.log('[API] 응답 데이터:', data);

        return data;
    } catch (error) {
        console.error('[API] 거래 내역 조회 오류:', error);
        console.error('[API] 오류 상세:', error.message);
        throw error;
    }
}
