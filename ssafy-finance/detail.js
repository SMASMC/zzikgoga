// DOM 요소
const backBtn = document.getElementById('backBtn');
const userName = document.getElementById('userName');
const userAccount = document.getElementById('userAccount');
const balanceInfo = document.getElementById('balanceInfo');
const transactionsList = document.getElementById('transactionsList');

// 계좌번호로 사용자 이름 찾기
function getNameByAccountNo(accountNo) {
    if (!accountNo) return '-';

    const allUsers = getUsers();
    const foundUser = allUsers.find(user => user.accountNo === accountNo);

    if (foundUser) {
        return `${foundUser.name} (${accountNo})`;
    }

    return accountNo;
}

// 뒤로가기
backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// 사용자 정보 로드
function loadUserInfo() {
    const userJson = localStorage.getItem('selectedUser');
    if (!userJson) {
        alert('사용자 정보가 없습니다.');
        window.location.href = 'index.html';
        return null;
    }

    const user = JSON.parse(userJson);
    userName.textContent = user.name;
    userAccount.textContent = `계좌번호: ${user.accountNo} (은행코드: ${user.bankCode})`;

    return user;
}

// 잔액 정보 표시
function displayBalance(data) {
    console.log('[DETAIL] 잔액 응답 데이터:', data);

    if (data.Header.responseCode !== 'H0000') {
        balanceInfo.innerHTML = `
            <div class="error">
                <p>오류: ${data.Header.responseMessage}</p>
                <p>응답 코드: ${data.Header.responseCode}</p>
            </div>
        `;
        return;
    }

    const rec = data.REC;
    console.log('[DETAIL] 잔액 REC 데이터:', rec);

    if (!rec) {
        balanceInfo.innerHTML = `
            <div class="error">
                <p>잔액 데이터를 가져올 수 없습니다.</p>
            </div>
        `;
        return;
    }
    balanceInfo.innerHTML = `
        <div class="balance-display">
            <div class="balance-item">
                <span class="label">현재 잔액</span>
                <span class="amount">${Number(rec.accountBalance).toLocaleString()} 원</span>
            </div>
            <div class="balance-details">
                <div class="detail-item">
                    <span class="label">계좌 개설일</span>
                    <span class="value">${formatDate(rec.accountCreatedDate)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">계좌 만료일</span>
                    <span class="value">${formatDate(rec.accountExpiryDate)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">최근 거래일</span>
                    <span class="value">${rec.lastTransactionDate ? formatDate(rec.lastTransactionDate) : '없음'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">통화</span>
                    <span class="value">${rec.currency}</span>
                </div>
            </div>
        </div>
    `;
}

// 거래 내역 표시
function displayTransactions(data) {
    console.log('[DETAIL] 거래 내역 응답 데이터:', data);

    if (data.Header.responseCode !== 'H0000') {
        transactionsList.innerHTML = `
            <div class="error">
                <p>오류: ${data.Header.responseMessage}</p>
                <p>응답 코드: ${data.Header.responseCode}</p>
            </div>
        `;
        return;
    }

    const rec = data.REC;
    console.log('[DETAIL] REC 데이터:', rec);

    // REC가 객체이고 list 속성이 있는 경우
    const transactions = rec.list || rec;
    console.log('[DETAIL] 거래 내역 리스트:', transactions);
    console.log('[DETAIL] 총 거래 수:', rec.totalCount);

    // 배열인지 확인
    if (!transactions) {
        transactionsList.innerHTML = '<p class="empty-message">거래 내역이 없습니다.</p>';
        return;
    }

    // 배열이 아니면 배열로 변환 시도
    const transactionsArray = Array.isArray(transactions) ? transactions : [transactions];

    if (transactionsArray.length === 0) {
        transactionsList.innerHTML = '<p class="empty-message">거래 내역이 없습니다.</p>';
        return;
    }

    let html = '<div class="transactions-list">';

    transactionsArray.forEach(tx => {
        const isDeposit = tx.transactionType === '1';
        const typeClass = isDeposit ? 'deposit' : 'withdrawal';
        const amountSign = isDeposit ? '+' : '-';
        const amount = Number(tx.transactionBalance).toLocaleString();
        const afterBalance = Number(tx.transactionAfterBalance).toLocaleString();

        html += `
            <div class="transaction-item ${typeClass}">
                <div class="transaction-header">
                    <div class="transaction-info">
                        <span class="transaction-type">${tx.transactionTypeName}</span>
                        <span class="transaction-date">${formatDate(tx.transactionDate)} ${tx.transactionTime ? tx.transactionTime.replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3') : ''}</span>
                    </div>
                    <div class="transaction-amount ${typeClass}">
                        ${amountSign} ${amount}원
                    </div>
                </div>
                <div class="transaction-details">
                    <div class="detail-row">
                        <span class="label">거래 후 잔액</span>
                        <span class="value">${afterBalance}원</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">상대 계좌</span>
                        <span class="value">${getNameByAccountNo(tx.transactionAccountNo)}</span>
                    </div>
                    ${tx.transactionSummary ? `
                    <div class="detail-row">
                        <span class="label">거래 내용</span>
                        <span class="value">${tx.transactionSummary}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="label">거래 고유번호</span>
                        <span class="value">${tx.transactionUniqueNo}</span>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    transactionsList.innerHTML = html;
}

// 날짜 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
function formatDate(dateString) {
    if (!dateString || dateString.length !== 8) return dateString;

    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);

    return `${year}-${month}-${day}`;
}

// 데이터 로드
async function loadData() {
    const user = loadUserInfo();
    if (!user) return;

    const startDate = localStorage.getItem('startDate');
    const endDate = localStorage.getItem('endDate');

    try {
        // CSV 파일 다시 로드 (최신 데이터 반영)
        console.log('[DETAIL] CSV 파일 로드 중...');
        await loadCSVFromFile('users-sample.csv');
        console.log('[DETAIL] CSV 파일 로드 완료');

        // 잔액 조회
        const balanceData = await inquireBalance(user.accountNo);
        displayBalance(balanceData);

        // 거래 내역 조회
        const transactionsData = await inquireTransactionHistory(user.accountNo, startDate, endDate);
        displayTransactions(transactionsData);

    } catch (error) {
        console.error('[DETAIL] 데이터 로드 오류:', error);

        balanceInfo.innerHTML = `
            <div class="error">
                <p>데이터 로드 중 오류가 발생했습니다.</p>
                <p>${error.message}</p>
            </div>
        `;

        transactionsList.innerHTML = `
            <div class="error">
                <p>데이터 로드 중 오류가 발생했습니다.</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// 페이지 로드 시 데이터 로드
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 데이터 로드
        await loadData();
    } catch (error) {
        console.error('[DETAIL] 초기화 오류:', error);
        balanceInfo.innerHTML = `
            <div class="error">
                <p>초기화 중 오류가 발생했습니다.</p>
                <p>${error.message}</p>
                <p>프록시 서버(npm start)를 실행했는지 확인하세요.</p>
            </div>
        `;
        transactionsList.innerHTML = `
            <div class="error">
                <p>초기화 중 오류가 발생했습니다.</p>
                <p>${error.message}</p>
                <p>프록시 서버(npm start)를 실행했는지 확인하세요.</p>
            </div>
        `;
    }
});
