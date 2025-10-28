# Zzikgoga Frontend

PWA를 적용한 React TypeScript 프로젝트입니다.

## 기술 스택

- **Frontend Framework**: React 18.3
- **Type System**: TypeScript 5.6
- **Build Tool**: Vite 6.0
- **Routing**: React Router DOM 7.1
- **State Management**: Zustand 5.0
- **PWA**: vite-plugin-pwa 0.21
- **Code Quality**: ESLint, Prettier

## 프로젝트 구조

```
src/
├── routes/             # 경로 설정
├── components/         # 공통 재사용 가능한 UI 컴포넌트
│   ├── atoms/          # 기본 요소 (Button, Input, Badge)
│   └── blocks/         # 복합 + 조합 요소 (Header, QuizCard, SearchBox, Modal)
├── features/           # 기능별 모듈
│   ├── auth/           # 인증 관련
│   │   ├── components/ # auth 내에서만 사용하는 components
│   │   ├── stores/     # 해당 기능에서 사용되는 store
│   │   ├── hooks/      # 상태, 로직 묶음
│   │   ├── services/   # API 요청 또는 데이터 처리
│   │   └── types/      # models, Field, enum 등
├── shared/             # 공통 모듈
│   ├── api/            # JWT Auth api
│   ├── utils/          # S3 Upload 등 유틸리티
│   └── stores/         # 전역 상태관리(zustand) store
├── pages/              # 라우트 페이지
└── assets/             # 정적 자원 (image, font)
```

## 설계 패턴

- **Feature-Based Architecture**: 기능별로 모듈을 구성하여 확장성과 유지보수성 향상
- **Atomic UI Design**: atoms(원자), blocks(복합체)로 컴포넌트 계층 구조화

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사하고 필요한 값을 설정하세요.

```bash
cp .env.example .env
```

### 3. 개발 서버 실행

```bash
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 스크립트

```bash
# 개발 서버 실행 (포맷팅, 린트, 타입체크 포함)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 빌드 미리보기
npm run preview

# 빌드 후 미리보기
npm run build:run

# 타입 체크
npm run typecheck

# ESLint 실행
npm run lint

# ESLint 자동 수정
npm run lint:fix

# Prettier 포맷팅
npm run format

# Prettier 포맷 체크
npm run format:check
```

## PWA 기능

이 프로젝트는 Progressive Web App(PWA)으로 구성되어 있습니다:

- 오프라인 지원
- 설치 가능한 앱
- 자동 업데이트
- 백그라운드 동기화
- 푸시 알림 (추가 구현 필요)

## Jenkins 배포

Jenkins를 통한 CI/CD가 설정되어 있습니다. `Jenkinsfile`을 참고하세요.

### 배포 단계

1. 의존성 설치
2. 빌드
3. 아티팩트 아카이빙
4. 배포 (Nginx 또는 S3)

## 주요 Path Alias

TypeScript와 Vite에서 다음 경로 별칭을 사용할 수 있습니다:

- `@/*` - src 디렉토리
- `@components/*` - 공통 컴포넌트
- `@features/*` - 기능별 모듈
- `@shared/*` - 공유 모듈
- `@pages/*` - 페이지 컴포넌트
- `@routes/*` - 라우팅 설정
- `@assets/*` - 정적 자원

## 코드 스타일

- **ESLint**: React, TypeScript 권장 규칙 적용
- **Prettier**: 일관된 코드 포맷팅
  - 세미콜론 없음
  - 작은따옴표 사용
  - 탭 너비: 2칸
  - 줄바꿈: LF

## 라이선스

Private
