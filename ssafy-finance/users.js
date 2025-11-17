// 사용자 데이터 관리
let users = [];

// CSV 파일 파싱 함수
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const parsedUsers = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.trim());
        parsedUsers.push({
            name: values[0],
            bankCode: values[1],
            accountNo: values[2]
        });
    }

    return parsedUsers;
}

// CSV 파일 로드
function loadCSVFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                users = parseCSV(e.target.result);
                resolve(users);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// CSV 파일 자동 로드 (fetch 사용)
async function loadCSVFromFile(filename = 'users-sample.csv') {
    try {
        console.log('[USERS] CSV 파일 로드 시작:', filename);
        const response = await fetch(filename);

        if (!response.ok) {
            throw new Error(`HTTP 오류! 상태: ${response.status} ${response.statusText}`);
        }

        const csvText = await response.text();
        console.log('[USERS] CSV 파일 내용:', csvText);

        users = parseCSV(csvText);
        console.log('[USERS] 파싱된 사용자 수:', users.length);
        console.log('[USERS] 사용자 목록:', users);

        return users;
    } catch (error) {
        console.error('[USERS] CSV 파일 로드 실패:', error);
        console.error('[USERS] 오류 상세:', error.message);
        throw error;
    }
}

// 샘플 사용자 데이터
const sampleUsers = [
    { name: '홍길동', bankCode: '001', accountNo: '0016174648358792' },
    { name: '김철수', bankCode: '002', accountNo: '0204667768182760' },
    { name: '이영희', bankCode: '001', accountNo: '0013456789012345' }
];

// 샘플 데이터 로드
function loadSampleData() {
    users = [...sampleUsers];
    return users;
}

// 사용자 목록 가져오기
function getUsers() {
    return users;
}
