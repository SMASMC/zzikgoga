-- PostgreSQL 스키마 생성 스크립트 (최종 버전)
-- 레거시 테이블 처리, 인덱스 제외, 모든 테이블에 updated_at 트리거 적용

-- ENUM 타입 생성 (PostgreSQL 고유: 문자열 제한을 위한 사용자 정의 타입)
CREATE TYPE member_provider AS ENUM('KAKAO', 'GOOGLE', 'NAVER');
CREATE TYPE member_gender AS ENUM('MALE', 'FEMALE');
CREATE TYPE memory_status AS ENUM('onprocess', 'completed');
CREATE TYPE mint_status AS ENUM('none', 'pending', 'success', 'failed');
CREATE TYPE storage_type AS ENUM('s3', 'arweave');
CREATE TYPE budget_category AS ENUM('STAY', 'FOOD', 'TRANSPORT', 'SHOPPING', 'LEISURE', 'ETC');

-- 1. member 테이블 (기본 사용자 정보: OAuth, 지갑, 은행 연동)
CREATE TABLE "member" (
                          "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                          "email" VARCHAR(255) UNIQUE NOT NULL COMMENT '사용자 이메일, 고유',
                          "password" VARCHAR(128) NULL COMMENT 'Argon2로 단방향 암호화, 추후 자체 로그인 확장성을 고려하기 위해 nullable로 만들어둠',
                          "provider" member_provider NOT NULL COMMENT 'Unique, 현 개발에선 카카오로만 사용',
                          "provider_id" VARCHAR(128) UNIQUE NOT NULL COMMENT 'Unique, OAuth 제공자별 사용자 ID',
                          "name" VARCHAR(50) NOT NULL COMMENT '사용자 이름',
                          "gender" member_gender NOT NULL COMMENT '성별',
                          "birth_year" SMALLINT NOT NULL COMMENT '카카오 oauth로 출생년도 받아옴',
                          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)',
                          "bank_code" VARCHAR(50) NOT NULL COMMENT '노션의 mapping 페이지 참고, 은행 코드',
                          "account_num" VARCHAR(50) NOT NULL COMMENT '계좌번호 (정산 송금용)',
                          "thumbnail_url" VARCHAR(1024) NULL COMMENT 'null이라면 우리 서비스에서 만든 이름기반 썸네일로',
                          "wallet_address" VARCHAR(255) DEFAULT '' NOT NULL COMMENT 'Arweave/NFT 지갑 주소',
                          "wallet_private_key" TEXT DEFAULT '' NOT NULL COMMENT '지갑 프라이빗 키 (암호화 저장, 보안 주의)',
                          "remaining_arweave_uses" SMALLINT DEFAULT 1 NOT NULL COMMENT '남은 Arweave 사용 횟수 (NFT 민팅 제한)'
);

-- 2. companion 테이블 (동행자: trip에 속하지 않는 외부 인원)
CREATE TABLE "companion" (
                             "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                             "name" VARCHAR(50) NOT NULL COMMENT '동행자 이름 (비회원)',
                             "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                             "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)'
);

-- 3. thema 테이블 (여행 테마: 재사용 가능한 카테고리)
CREATE TABLE "thema" (
                         "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                         "name" VARCHAR(50) NOT NULL COMMENT '테마 이름 (예: "맛집투어", "휴양")',
                         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                         "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)'
);

-- 4. trip 테이블 (여행 기본 정보: 소유자 중심)
CREATE TABLE "trip" (
                        "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                        "owner_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE COMMENT '여행 생성자 (소유자) ID - 소유자 삭제 시 여행도 삭제',
                        "title" VARCHAR(100) NOT NULL COMMENT '여행 제목 (예: "제주도 3박4일")',
                        "start_date" DATE NOT NULL COMMENT '여행 시작일',
                        "end_date" DATE NOT NULL COMMENT '여행 종료일',
                        "male_count" SMALLINT DEFAULT 0 NOT NULL COMMENT '남성 인원 수 (참여자 + 동행자)',
                        "female_count" SMALLINT DEFAULT 0 NOT NULL COMMENT '여성 인원 수',
                        "is_cost_completed" BOOLEAN DEFAULT FALSE NOT NULL COMMENT '비용 정산 완료 여부 (전체 정산 상태)',
                        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)'
);

-- 5. trip_member 테이블 (여행-멤버 다대다: 참여자 관리)
CREATE TABLE "trip_member" (
                               "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                               "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '여행 ID - 여행 삭제 시 참여 기록 삭제',
                               "member_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE COMMENT '참여 멤버 ID - 멤버 삭제 시 참여 기록 삭제',
                               "is_cost_accepted" BOOLEAN DEFAULT FALSE NOT NULL COMMENT '비용 정산 동의 여부 (개인별)',
                               "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                               "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)',
                               UNIQUE("trip_id", "member_id") COMMENT '중복 참여 방지 (한 멤버가 같은 여행에 여러 번 참여 불가)'
);

-- 6. trip_companion 테이블 (여행-동행자 다대다: 비회원 동행 관리)
CREATE TABLE "trip_companion" (
                                  "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                                  "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '여행 ID - 여행 삭제 시 동행 기록 삭제',
                                  "companion_id" BIGINT NOT NULL REFERENCES "companion"("id") ON DELETE CASCADE COMMENT '동행자 ID - 동행자 삭제 시 기록 삭제',
                                  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                                  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)',
                                  UNIQUE("trip_id", "companion_id") COMMENT '중복 동행자 방지'
);

-- 7. trip_thema 테이블 (여행-테마 다대다: 테마 할당)
CREATE TABLE "trip_thema" (
                              "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                              "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '여행 ID - 여행 삭제 시 테마 할당 삭제',
                              "thema_id" BIGINT NOT NULL REFERENCES "thema"("id") ON DELETE CASCADE COMMENT '테마 ID - 테마 삭제 시 할당 삭제',
                              "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                              "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)',
                              UNIQUE("trip_id", "thema_id") COMMENT '중복 테마 방지 (한 여행에 같은 테마 여러 번 불가)'
);

-- 8. budget 테이블 (여행 예산: 일자별 카테고리 계획)
CREATE TABLE "budget" (
                          "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                          "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '여행 ID - 여행 삭제 시 예산 삭제',
                          "date" DATE NOT NULL COMMENT '예산 적용일 (예: 여행 첫째 날)',
                          "category" budget_category NOT NULL COMMENT '예산 카테고리 (숙소/식비 등)',
                          "description" TEXT NULL COMMENT '예산 설명 (예: "호텔 예약 예상")',
                          "amount" NUMERIC(12,0) DEFAULT 0 NOT NULL COMMENT '예산 금액 (0부터 시작)',
                          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)',
                          UNIQUE("trip_id", "date", "category") COMMENT '같은 여행/날짜/카테고리 중복 방지'
);

-- 9. schedule 테이블 (여행 일정: 시간 기반 스케줄링)
CREATE TABLE "schedule" (
                            "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                            "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '여행 ID - 여행 삭제 시 일정 삭제',
                            "start_time" TIMESTAMP WITH TIME ZONE NOT NULL COMMENT '일정 시작 시간 (시차 포함)',
                            "offset_time" INTERVAL NOT NULL COMMENT '일정 오프셋 시간 (interval이 시간계산을 쉽게 해주는 자료형 - 예: +2 hours)',
                            "memo" VARCHAR(1000) NULL COMMENT '일정 메모 (상세 설명)',
                            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)',
                            "has_location" BOOLEAN DEFAULT FALSE NOT NULL COMMENT '반정규화, 위치 정보 보유 여부 (성능 위해 미리 계산)'
);

-- 10. location 테이블 (일정 위치: 상세 주소 + 위경도)
CREATE TABLE "location" (
                            "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                            "schedule_id" BIGINT NOT NULL REFERENCES "schedule"("id") ON DELETE CASCADE COMMENT '연결된 일정 ID - 일정 삭제 시 위치 삭제',
                            "name" VARCHAR(200) NOT NULL COMMENT '장소 이름 (예: "제주 해운대 호텔")',
                            "sido" VARCHAR(20) NOT NULL COMMENT '시/도 (예: "제주특별자치도")',
                            "sigungu" VARCHAR(20) NOT NULL COMMENT '시/군/구',
                            "road_name" VARCHAR(100) NOT NULL COMMENT '도로명',
                            "building_num" VARCHAR(10) NOT NULL COMMENT '건물 번호',
                            "detail" VARCHAR(100) NULL COMMENT '상세 주소 (예: "101호")',
                            "full_address" TEXT NOT NULL COMMENT '표시용 / 전체 도로명주소 (프론트엔드 표시용)',
                            "latitude" DOUBLE PRECISION NULL COMMENT '추후 위경도 기능 확장용 (지도 API 연동)',
                            "longitude" DOUBLE PRECISION NULL COMMENT '추후 위경도 기능 확장용 (longtitude 오타 수정)',
                            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)'
);

-- 11. cost 테이블 (비용 지출: OCR 기반 기록)
CREATE TABLE "cost" (
                        "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                        "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '연결된 여행 ID - 여행 삭제 시 비용 삭제',
                        "created_by" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE RESTRICT COMMENT '비용 생성자 ID (삭제 제한 - 데이터 무결성 보호)',
                        "payer_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE RESTRICT COMMENT '결제자 ID (삭제 제한)',
                        "paid_at" TEXT NOT NULL COMMENT 'OCR 인식의 형식 불일치 한계로 인해 정렬기능 미제공으로 고려하여 TEXT로 정함 (예: "2023-10-01 14:30")',
                        "place" VARCHAR(200) NOT NULL COMMENT '지출 장소 (예: "편의점")',
                        "total_amount" BIGINT NOT NULL COMMENT '총 지출 금액 (원 단위)',
                        "memo" TEXT NULL COMMENT '메모 (빈 값 허용, 추가 설명)',
                        "receipt" TEXT NULL COMMENT '영수증 텍스트 (OCR 결과, 빈 값 허용)',
                        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)',
                        "receipt_url" VARCHAR(1024) NULL COMMENT 's3 링크 (영수증 이미지 저장)'
);

-- 12. cost_menu 테이블 (비용 세부 메뉴: 영수증 항목 분해)
CREATE TABLE "cost_menu" (
                             "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                             "cost_id" BIGINT NOT NULL REFERENCES "cost"("id") ON DELETE CASCADE COMMENT '연결된 비용 ID - 비용 삭제 시 메뉴 삭제',
                             "menu_name" VARCHAR(200) NOT NULL COMMENT '메뉴가 없는 불친절한 영수증인 경우엔 해당 값이 "전체"로, 1개의 row로 들어감 (예: "커피", "전체")',
                             "amount" BIGINT NOT NULL COMMENT '메뉴 금액 (개별 항목)',
                             "must_payer_ids" JSONB NULL COMMENT '반정규화. 정산 별 메뉴 별 결제자로 그룹카운트하는데에 시간이 너무 걸릴것같아서 만듬 (배열: [member_id1, member_id2])',
                             "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                             "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)'
);

-- 13. cost_menu_member 테이블 (레거시: 과거 형식, 현재 사용 안 함 - cost_menu.must_payer_ids로 대체)
CREATE TABLE "cost_menu_member" (
                                    "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                                    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시 (레거시)',
                                    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트, 레거시)'
);

-- 14. photo 테이블 (여행 사진: S3 저장)
CREATE TABLE "photo" (
                         "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                         "member_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE COMMENT '업로드 멤버 ID - 멤버 삭제 시 사진 삭제',
                         "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '연결된 여행 ID - 여행 삭제 시 사진 삭제',
                         "s3_url" VARCHAR(1024) NOT NULL COMMENT 'S3 저장 URL (AWS S3 버킷 링크)',
                         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시 (업로드 시간)',
                         "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (NULL 허용, 편집 시 업데이트)'
);

-- 15. memory 테이블 (여행 추억: NFT/문서 생성)
CREATE TABLE "memory" (
                          "id" BIGSERIAL PRIMARY KEY COMMENT '자동 증가 ID',
                          "member_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE COMMENT '생성 멤버 ID - 멤버 삭제 시 추억 삭제',
                          "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE COMMENT '연결된 여행 ID - 여행 삭제 시 추억 삭제',
                          "title" VARCHAR(255) NOT NULL COMMENT '추억 제목 (예: "제주 여행 회상")',
                          "status" memory_status DEFAULT 'onprocess' NOT NULL COMMENT '처리 상태 (진행중/완료)',
                          "content" JSONB NULL COMMENT '임시저장, 콘텐츠 JSON (사진/텍스트 배열)',
                          "pdf_url" VARCHAR(1024) NULL COMMENT 'PDF URL (문서 생성 결과)',
                          "arweave_url" VARCHAR(1024) NULL COMMENT 'Arweave 저장 URL (영구 저장소)',
                          "nft_id" VARCHAR(255) NULL COMMENT 'NFT ID (민팅 완료 시)',
                          "mint_status" mint_status DEFAULT 'none' NOT NULL COMMENT '민팅 상태 (없음/대기/성공/실패)',
                          "mint_hash" VARCHAR(255) NULL COMMENT '트랜잭션 해시 (블록체인 증명)',
                          "storage_type" storage_type NULL COMMENT '저장 타입 (S3 or Arweave)',
                          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
                          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '수정일시 (트리거로 자동 업데이트)'
);

-- updated_at 자동 업데이트 트리거 함수 (공통: 모든 테이블 업데이트 시 현재 시간으로 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 모든 테이블에 트리거 일괄 적용 (DO 블록: 생성 후 실행 - 테이블 목록 동적으로 검색)
DO $$
DECLARE
tbl RECORD;
BEGIN
    -- public 스키마의 모든 사용자 테이블에 트리거 생성 (시스템 테이블 제외)
FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
                                             AND tablename NOT IN ('spatial_ref_sys', 'geometry_columns')  -- GIS 관련 시스템 테이블 제외
    LOOP
        EXECUTE format('
            CREATE TRIGGER IF NOT EXISTS update_%I_updated_at
            BEFORE UPDATE ON "%I"
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', tbl.tablename, tbl.tablename);
RAISE NOTICE '트리거 적용 완료: %', tbl.tablename;  -- 로그 출력 (테스트용)
END LOOP;
END;
$$;
