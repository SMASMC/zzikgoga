// DOM 요소
const usersList = document.getElementById('usersList');
const startDateTime = document.getElementById('startDateTime');

// 초기 날짜 설정
function setDefaultDateTime() {
    // localStorage에서 저장된 날짜 확인
    const savedDateTime = localStorage.getItem('searchStartDateTime');

    if (savedDateTime) {
        console.log('[APP] 저장된 날짜 로드:', savedDateTime);
        startDateTime.value = savedDateTime;
    } else {
        // 저장된 날짜가 없으면 1년 전으로 설정
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

        const formatDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        startDateTime.value = formatDateTime(oneYearAgo);
    }
}

// 날짜 변경 시 localStorage에 저장
startDateTime.addEventListener('change', () => {
    console.log('[APP] 날짜 범위 변경:', startDateTime.value);
    localStorage.setItem('searchStartDateTime', startDateTime.value);
});

// 사용자 목록 렌더링
function renderUsers() {
    const currentUsers = getUsers();

    if (currentUsers.length === 0) {
        usersList.innerHTML = '<p class="empty-message">사용자 데이터를 로드하는 중...</p>';
        return;
    }

    console.log('[APP] 사용자 목록 렌더링:', currentUsers.length, '명');
    usersList.innerHTML = '';
    currentUsers.forEach((user, index) => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.innerHTML = `
            <div class="user-info">
                <h3>${user.name}</h3>
                <p>은행코드: ${user.bankCode}</p>
                <p>계좌번호: ${user.accountNo}</p>
            </div>
            <button class="btn btn-primary" onclick="viewUserDetails(${index})">조회</button>
        `;
        usersList.appendChild(userCard);
    });
}

// 사용자 상세 정보 조회
function viewUserDetails(userIndex) {
    const currentUsers = getUsers();
    const user = currentUsers[userIndex];
    const startDate = startDateTime.value;

    if (!startDate) {
        alert('조회 시작 날짜를 선택해주세요.');
        return;
    }

    console.log('[APP] 사용자 상세 조회:', user.name);

    // 날짜 형식 변환 (YYYY-MM-DDTHH:mm -> YYYYMMDD)
    const formatDateForAPI = (dateTimeString) => {
        const date = new Date(dateTimeString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const formattedStartDate = formatDateForAPI(startDate);

    // 현재 날짜 (종료일)
    const now = new Date();
    const endDate = formatDateForAPI(now.toISOString());

    // 상세 페이지로 데이터 전달 (localStorage 사용)
    localStorage.setItem('selectedUser', JSON.stringify(user));
    localStorage.setItem('startDate', formattedStartDate);
    localStorage.setItem('endDate', endDate);

    // 상세 페이지로 이동
    window.location.href = 'detail.html';
}

// 메시지 표시
function showMessage(message, type) {
    // 기존 메시지 제거
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // 새 메시지 생성
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;

    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);

    // 3초 후 자동 제거
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('[APP] 페이지 초기화 시작');

        // 날짜 설정
        setDefaultDateTime();

        // CSV 파일 자동 로드
        console.log('[APP] CSV 파일 자동 로드 시작');
        await loadCSVFromFile('users-sample.csv');

        // 사용자 목록 렌더링
        renderUsers();

        console.log('[APP] 페이지 초기화 완료');
    } catch (error) {
        console.error('[APP] 초기화 오류:', error);
        console.error('[APP] 오류 상세:', error.message);
        showMessage('초기화 중 오류가 발생했습니다: ' + error.message, 'error');
        usersList.innerHTML = `
            <div class="error">
                <p>데이터 로드 실패</p>
                <p>${error.message}</p>
                <p>프록시 서버(npm start)를 실행했는지 확인하세요.</p>
            </div>
        `;
    }
});
