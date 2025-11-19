# SSAFY 금융 조회 시스템

SSAFY 금융망 API를 활용한 계좌 잔액 및 거래 내역 조회 웹 애플리케이션입니다.

## 기능

- 여러 사용자의 계좌 정보 관리 (CSV 자동 로드)
- 계좌 잔액 조회
- 거래 내역 조회 (날짜 범위 지정 및 localStorage 저장)
- 깔끔하고 직관적인 UI
- CORS 우회를 위한 프록시 서버

## 사용 방법

### 1. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 API 키를 입력하세요:

```bash
cp .env.example .env
```

그 다음 `.env` 파일을 열어서 API 키와 User 키를 입력:

```env
API_KEY=your_api_key_here
USER_KEY=your_user_key_here
BASE_URL=https://finopenapi.ssafy.io/ssafy/api/v1/edu
```

**중요**: `.env` 파일은 Git에 커밋되지 않으므로 안전하게 API 키를 보관할 수 있습니다.

### 2. 의존성 설치

```bash
npm install
```

### 3. 프록시 서버 실행

**CORS 문제 해결을 위해 반드시 Node.js 프록시 서버를 사용해야 합니다!**

```bash
npm start
```

또는 개발 모드 (자동 재시작):

```bash
npm run dev
```

서버가 시작되면 다음과 같은 메시지가 표시됩니다:

```
╔════════════════════════════════════════════════╗
║   SSAFY Finance Proxy Server                  ║
╚════════════════════════════════════════════════╝

🚀 서버 실행 중: http://localhost:3000
📁 정적 파일 제공: /path/to/ssafy-finance
🔄 API 프록시: /api/* → finopenapi.ssafy.io

브라우저에서 http://localhost:3000 로 접속하세요.
```

### 4. 브라우저 접속

브라우저에서 `http://localhost:3000` 접속

### 5. 사용

1. 페이지가 로드되면 자동으로 `users-sample.csv` 파일을 읽어와 사용자 목록을 표시합니다.
2. 조회 날짜 범위를 선택하면 localStorage에 자동 저장됩니다. (다음 접속 시 자동 적용)
3. 원하는 사용자의 "조회" 버튼을 클릭하면 상세 페이지로 이동합니다.
4. 계좌 잔액과 거래 내역을 확인할 수 있습니다.
5. "뒤로가기" 버튼으로 메인 페이지로 돌아갈 수 있습니다.

## 파일 구조

```
ssafy-finance/
├── index.html          # 메인 페이지
├── detail.html         # 상세 페이지
├── app.js             # 메인 페이지 로직
├── detail.js          # 상세 페이지 로직
├── config.js          # API 설정 및 함수
├── users.js           # 사용자 데이터 관리
├── styles.css         # 스타일시트
├── server.js          # Node.js 프록시 서버
├── package.json       # Node.js 의존성
├── users-sample.csv   # 샘플 CSV 파일 (자동 로드됨)
├── .env               # 환경 변수 (Git 무시됨)
├── .env.example       # 환경 변수 예제
├── .gitignore         # Git 무시 파일 목록
└── README.md          # 이 파일
```

## 기술 스택

### 프론트엔드
- HTML5
- CSS3 (반응형 디자인)
- Vanilla JavaScript (ES6+)

### 백엔드
- Node.js
- Express.js (프록시 서버)
- CORS (CORS 문제 해결)
- dotenv (환경 변수 관리)

## API 정보

### 계좌 잔액 조회
- 프록시: `/api/demandDeposit/inquireDemandDepositAccountBalance`
- 실제 URL: `https://finopenapi.ssafy.io/ssafy/api/v1/edu/demandDeposit/inquireDemandDepositAccountBalance`
- Method: POST

### 거래 내역 조회
- 프록시: `/api/demandDeposit/inquireTransactionHistoryList`
- 실제 URL: `https://finopenapi.ssafy.io/ssafy/api/v1/edu/demandDeposit/inquireTransactionHistoryList`
- Method: POST

## CORS 문제 해결

브라우저에서 직접 SSAFY API를 호출하면 CORS 에러가 발생합니다. 이를 해결하기 위해:

1. **Node.js 프록시 서버 사용**: `server.js`가 중간에서 API 호출을 대신 처리
2. **프론트엔드 → 프록시 → SSAFY API**: 브라우저는 같은 도메인의 프록시만 호출
3. **CORS 설정**: Express에서 CORS 허용

**중요**: 반드시 `npm start`로 프록시 서버를 실행해야 합니다!

## 주의사항

- `.env` 파일에 API 키와 User 키를 반드시 설정해야 합니다.
- 반드시 Node.js 프록시 서버(`npm start`)를 통해 실행해야 합니다.
- `.env` 파일은 Git에 커밋되지 않으므로 안전하게 API 키를 보관할 수 있습니다.
- 실제 금융 정보를 다루므로 API 키를 외부에 노출하지 마세요.

## 문제 해결

### Node.js가 설치되지 않은 경우
Node.js를 설치하세요: https://nodejs.org/

### npm install 실패
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

### .env 파일을 찾을 수 없다는 오류
- `.env.example` 파일을 `.env`로 복사했는지 확인하세요.
- `.env` 파일이 프로젝트 루트(`ssafy-finance/`)에 위치하는지 확인하세요.

### CORS 오류가 발생하는 경우
- **반드시 `npm start`로 프록시 서버를 실행**하세요.
- `http://localhost:3000`으로 접속하고 있는지 확인하세요.
- Python 웹 서버는 사용하지 마세요!

### API 호출 실패
- `.env` 파일의 API 키와 User 키가 올바른지 확인하세요.
- 프록시 서버가 실행 중인지 확인하세요.
- 브라우저 개발자 도구의 Console과 Network 탭에서 오류를 확인하세요.
- 서버 터미널에서 `[PROXY]` 로그를 확인하세요.

## 개발 시 유용한 정보

### 콘솔 로그
브라우저 F12 → Console 탭:
- `[CONFIG]`: 환경 변수 로드
- `[USERS]`: CSV 파일 로드
- `[API]`: API 요청/응답
- `[APP]`: 앱 초기화

서버 터미널:
- `[PROXY]`: 프록시 요청/응답

### CSV 파일 형식
```csv
이름,은행코드,계좌번호
강신지,004,0045754922358584
곽주혜,002,0021472290024797
```
