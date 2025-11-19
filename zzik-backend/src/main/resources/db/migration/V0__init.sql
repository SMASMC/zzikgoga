-- PostgreSQL 스키마 생성 스크립트 (수정 버전: COMMENT 분리, 트리거 안정화)
-- 레거시 테이블 처리, 인덱스 제외, 모든 테이블에 updated_at 트리거 적용
-- PostgreSQL 16+ 호환, public 스키마 기준

-- 1. ENUM 타입 생성
CREATE TYPE member_provider AS ENUM('KAKAO', 'GOOGLE', 'NAVER');
CREATE TYPE member_gender AS ENUM('MALE', 'FEMALE');
CREATE TYPE memory_status AS ENUM('onprocess', 'completed');
CREATE TYPE mint_status AS ENUM('none', 'pending', 'success', 'failed');
CREATE TYPE storage_type AS ENUM('s3', 'arweave');
CREATE TYPE budget_category AS ENUM('STAY', 'FOOD', 'TRANSPORT', 'SHOPPING', 'LEISURE', 'ETC');

-- 2. 테이블 생성 (기존과 동일, COMMENT 제외)
CREATE TABLE "member" (
                          "id" BIGSERIAL PRIMARY KEY,
                          "email" VARCHAR(255) UNIQUE NOT NULL,
                          "password" VARCHAR(128) NULL,
                          "provider" member_provider NOT NULL,
                          "provider_id" VARCHAR(128) UNIQUE NOT NULL,
                          "name" VARCHAR(50) NOT NULL,
                          "gender" member_gender NOT NULL,
                          "birth_year" SMALLINT NOT NULL,
                          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "bank_code" VARCHAR(50) NOT NULL,
                          "account_num" VARCHAR(50) NOT NULL,
                          "thumbnail_url" VARCHAR(1024) NULL,
                          "wallet_address" VARCHAR(255) DEFAULT '' NOT NULL,
                          "wallet_private_key" TEXT DEFAULT '' NOT NULL,
                          "remaining_arweave_uses" SMALLINT DEFAULT 1 NOT NULL
);

CREATE TABLE "companion" (
                             "id" BIGSERIAL PRIMARY KEY,
                             "name" VARCHAR(50) NOT NULL,
                             "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "thema" (
                         "id" BIGSERIAL PRIMARY KEY,
                         "name" VARCHAR(50) NOT NULL,
                         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "trip" (
                        "id" BIGSERIAL PRIMARY KEY,
                        "owner_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE,
                        "title" VARCHAR(100) NOT NULL,
                        "start_date" DATE NOT NULL,
                        "end_date" DATE NOT NULL,
                        "male_count" SMALLINT DEFAULT 0 NOT NULL,
                        "female_count" SMALLINT DEFAULT 0 NOT NULL,
                        "is_cost_completed" BOOLEAN DEFAULT FALSE NOT NULL,
                        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "trip_member" (
                               "id" BIGSERIAL PRIMARY KEY,
                               "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                               "member_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE,
                               "is_cost_accepted" BOOLEAN DEFAULT FALSE NOT NULL,
                               "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               UNIQUE("trip_id", "member_id")
);

CREATE TABLE "trip_companion" (
                                  "id" BIGSERIAL PRIMARY KEY,
                                  "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                                  "companion_id" BIGINT NOT NULL REFERENCES "companion"("id") ON DELETE CASCADE,
                                  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  UNIQUE("trip_id", "companion_id")
);

CREATE TABLE "trip_thema" (
                              "id" BIGSERIAL PRIMARY KEY,
                              "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                              "thema_id" BIGINT NOT NULL REFERENCES "thema"("id") ON DELETE CASCADE,
                              "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              UNIQUE("trip_id", "thema_id")
);

CREATE TABLE "budget" (
                          "id" BIGSERIAL PRIMARY KEY,
                          "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                          "date" DATE NOT NULL,
                          "category" budget_category NOT NULL,
                          "description" TEXT NULL,
                          "amount" NUMERIC(12,0) DEFAULT 0 NOT NULL,
                          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          UNIQUE("trip_id", "date", "category")
);

CREATE TABLE "schedule" (
                            "id" BIGSERIAL PRIMARY KEY,
                            "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                            "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
                            "offset_time" INTERVAL NOT NULL,
                            "memo" VARCHAR(1000) NULL,
                            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "has_location" BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE "location" (
                            "id" BIGSERIAL PRIMARY KEY,
                            "schedule_id" BIGINT NOT NULL REFERENCES "schedule"("id") ON DELETE CASCADE,
                            "name" VARCHAR(200) NOT NULL,
                            "sido" VARCHAR(20) NOT NULL,
                            "sigungu" VARCHAR(20) NOT NULL,
                            "road_name" VARCHAR(100) NOT NULL,
                            "building_num" VARCHAR(10) NOT NULL,
                            "detail" VARCHAR(100) NULL,
                            "full_address" TEXT NOT NULL,
                            "latitude" DOUBLE PRECISION NULL,
                            "longitude" DOUBLE PRECISION NULL,
                            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "cost" (
                        "id" BIGSERIAL PRIMARY KEY,
                        "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                        "created_by" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE RESTRICT,
                        "payer_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE RESTRICT,
                        "paid_at" TEXT NOT NULL,
                        "place" VARCHAR(200) NOT NULL,
                        "total_amount" BIGINT NOT NULL,
                        "memo" TEXT NULL,
                        "receipt" TEXT NULL,
                        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "receipt_url" VARCHAR(1024) NULL
);

CREATE TABLE "cost_menu" (
                             "id" BIGSERIAL PRIMARY KEY,
                             "cost_id" BIGINT NOT NULL REFERENCES "cost"("id") ON DELETE CASCADE,
                             "menu_name" VARCHAR(200) NOT NULL,
                             "count" SMALLINT NOT NULL DEFAULT 1,
                             "amount" BIGINT NOT NULL,
                             "must_payer_ids" JSONB NULL,
                             "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "cost_menu_member" (
                                    "id" BIGSERIAL PRIMARY KEY,
                                    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "photo" (
                         "id" BIGSERIAL PRIMARY KEY,
                         "member_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE,
                         "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                         "s3_url" VARCHAR(1024) NOT NULL,
                         "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         "updated_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "memory" (
                          "id" BIGSERIAL PRIMARY KEY,
                          "member_id" BIGINT NOT NULL REFERENCES "member"("id") ON DELETE CASCADE,
                          "trip_id" BIGINT NOT NULL REFERENCES "trip"("id") ON DELETE CASCADE,
                          "title" VARCHAR(255) NOT NULL,
                          "status" memory_status DEFAULT 'onprocess' NOT NULL,
                          "content" JSONB NULL,
                          "pdf_url" VARCHAR(1024) NULL,
                          "arweave_url" VARCHAR(1024) NULL,
                          "nft_id" VARCHAR(255) NULL,
                          "mint_status" mint_status DEFAULT 'none' NOT NULL,
                          "mint_hash" VARCHAR(255) NULL,
                          "storage_type" storage_type NULL,
                          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. COMMENT 추가 (기존과 동일, 전체 테이블/컬럼 커버)
COMMENT ON TABLE "member" IS '기본 사용자 정보: OAuth, 지갑, 은행 연동';
COMMENT ON COLUMN "member"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "member"."email" IS '사용자 이메일, 고유';
COMMENT ON COLUMN "member"."password" IS 'Argon2로 단방향 암호화, 추후 자체 로그인 확장성을 고려하기 위해 nullable로 만들어둠';
COMMENT ON COLUMN "member"."provider" IS 'Unique, 현 개발에선 카카오로만 사용';
COMMENT ON COLUMN "member"."provider_id" IS 'Unique, OAuth 제공자별 사용자 ID';
COMMENT ON COLUMN "member"."name" IS '사용자 이름';
COMMENT ON COLUMN "member"."gender" IS '성별';
COMMENT ON COLUMN "member"."birth_year" IS '카카오 oauth로 출생년도 받아옴';
COMMENT ON COLUMN "member"."created_at" IS '생성일시';
COMMENT ON COLUMN "member"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';
COMMENT ON COLUMN "member"."bank_code" IS '노션의 mapping 페이지 참고, 은행 코드';
COMMENT ON COLUMN "member"."account_num" IS '계좌번호 (정산 송금용)';
COMMENT ON COLUMN "member"."thumbnail_url" IS 'null이라면 우리 서비스에서 만든 이름기반 썸네일로';
COMMENT ON COLUMN "member"."wallet_address" IS 'Arweave/NFT 지갑 주소';
COMMENT ON COLUMN "member"."wallet_private_key" IS '지갑 프라이빗 키 (암호화 저장, 보안 주의)';
COMMENT ON COLUMN "member"."remaining_arweave_uses" IS '남은 Arweave 사용 횟수 (NFT 민팅 제한)';

COMMENT ON TABLE "companion" IS '동행자: trip에 속하지 않는 외부 인원';
COMMENT ON COLUMN "companion"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "companion"."name" IS '동행자 이름 (비회원)';
COMMENT ON COLUMN "companion"."created_at" IS '생성일시';
COMMENT ON COLUMN "companion"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "thema" IS '여행 테마: 재사용 가능한 카테고리';
COMMENT ON COLUMN "thema"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "thema"."name" IS '테마 이름 (예: "맛집투어", "휴양")';
COMMENT ON COLUMN "thema"."created_at" IS '생성일시';
COMMENT ON COLUMN "thema"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "trip" IS '여행 기본 정보: 소유자 중심';
COMMENT ON COLUMN "trip"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "trip"."owner_id" IS '여행 생성자 (소유자) ID - 소유자 삭제 시 여행도 삭제';
COMMENT ON COLUMN "trip"."title" IS '여행 제목 (예: "제주도 3박4일")';
COMMENT ON COLUMN "trip"."start_date" IS '여행 시작일';
COMMENT ON COLUMN "trip"."end_date" IS '여행 종료일';
COMMENT ON COLUMN "trip"."male_count" IS '남성 인원 수 (참여자 + 동행자)';
COMMENT ON COLUMN "trip"."female_count" IS '여성 인원 수';
COMMENT ON COLUMN "trip"."is_cost_completed" IS '비용 정산 완료 여부 (전체 정산 상태)';
COMMENT ON COLUMN "trip"."created_at" IS '생성일시';
COMMENT ON COLUMN "trip"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "trip_member" IS '여행-멤버 다대다: 참여자 관리';
COMMENT ON COLUMN "trip_member"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "trip_member"."trip_id" IS '여행 ID - 여행 삭제 시 참여 기록 삭제';
COMMENT ON COLUMN "trip_member"."member_id" IS '참여 멤버 ID - 멤버 삭제 시 참여 기록 삭제';
COMMENT ON COLUMN "trip_member"."is_cost_accepted" IS '비용 정산 동의 여부 (개인별)';
COMMENT ON COLUMN "trip_member"."created_at" IS '생성일시';
COMMENT ON COLUMN "trip_member"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "trip_companion" IS '여행-동행자 다대다: 비회원 동행 관리';
COMMENT ON COLUMN "trip_companion"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "trip_companion"."trip_id" IS '여행 ID - 여행 삭제 시 동행 기록 삭제';
COMMENT ON COLUMN "trip_companion"."companion_id" IS '동행자 ID - 동행자 삭제 시 기록 삭제';
COMMENT ON COLUMN "trip_companion"."created_at" IS '생성일시';
COMMENT ON COLUMN "trip_companion"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "trip_thema" IS '여행-테마 다대다: 테마 할당';
COMMENT ON COLUMN "trip_thema"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "trip_thema"."trip_id" IS '여행 ID - 여행 삭제 시 테마 할당 삭제';
COMMENT ON COLUMN "trip_thema"."thema_id" IS '테마 ID - 테마 삭제 시 할당 삭제';
COMMENT ON COLUMN "trip_thema"."created_at" IS '생성일시';
COMMENT ON COLUMN "trip_thema"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "budget" IS '여행 예산: 일자별 카테고리 계획';
COMMENT ON COLUMN "budget"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "budget"."trip_id" IS '여행 ID - 여행 삭제 시 예산 삭제';
COMMENT ON COLUMN "budget"."date" IS '예산 적용일 (예: 여행 첫째 날)';
COMMENT ON COLUMN "budget"."category" IS '예산 카테고리 (숙소/식비 등)';
COMMENT ON COLUMN "budget"."description" IS '예산 설명 (예: "호텔 예약 예상")';
COMMENT ON COLUMN "budget"."amount" IS '예산 금액 (0부터 시작)';
COMMENT ON COLUMN "budget"."created_at" IS '생성일시';
COMMENT ON COLUMN "budget"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "schedule" IS '여행 일정: 시간 기반 스케줄링';
COMMENT ON COLUMN "schedule"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "schedule"."trip_id" IS '여행 ID - 여행 삭제 시 일정 삭제';
COMMENT ON COLUMN "schedule"."start_time" IS '일정 시작 시간 (시차 포함)';
COMMENT ON COLUMN "schedule"."offset_time" IS '일정 오프셋 시간 (interval이 시간계산을 쉽게 해주는 자료형 - 예: +2 hours)';
COMMENT ON COLUMN "schedule"."memo" IS '일정 메모 (상세 설명)';
COMMENT ON COLUMN "schedule"."created_at" IS '생성일시';
COMMENT ON COLUMN "schedule"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';
COMMENT ON COLUMN "schedule"."has_location" IS '반정규화, 위치 정보 보유 여부 (성능 위해 미리 계산)';

COMMENT ON TABLE "location" IS '일정 위치: 상세 주소 + 위경도';
COMMENT ON COLUMN "location"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "location"."schedule_id" IS '연결된 일정 ID - 일정 삭제 시 위치 삭제';
COMMENT ON COLUMN "location"."name" IS '장소 이름 (예: "제주 해운대 호텔")';
COMMENT ON COLUMN "location"."sido" IS '시/도 (예: "제주특별자치도")';
COMMENT ON COLUMN "location"."sigungu" IS '시/군/구';
COMMENT ON COLUMN "location"."road_name" IS '도로명';
COMMENT ON COLUMN "location"."building_num" IS '건물 번호';
COMMENT ON COLUMN "location"."detail" IS '상세 주소 (예: "101호")';
COMMENT ON COLUMN "location"."full_address" IS '표시용 / 전체 도로명주소 (프론트엔드 표시용)';
COMMENT ON COLUMN "location"."latitude" IS '추후 위경도 기능 확장용 (지도 API 연동)';
COMMENT ON COLUMN "location"."longitude" IS '추후 위경도 기능 확장용 (longtitude 오타 수정)';
COMMENT ON COLUMN "location"."created_at" IS '생성일시';
COMMENT ON COLUMN "location"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "cost" IS '비용 지출: OCR 기반 기록';
COMMENT ON COLUMN "cost"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "cost"."trip_id" IS '연결된 여행 ID - 여행 삭제 시 비용 삭제';
COMMENT ON COLUMN "cost"."created_by" IS '비용 생성자 ID (삭제 제한 - 데이터 무결성 보호)';
COMMENT ON COLUMN "cost"."payer_id" IS '결제자 ID (삭제 제한)';
COMMENT ON COLUMN "cost"."paid_at" IS 'OCR 인식의 형식 불일치 한계로 인해 정렬기능 미제공으로 고려하여 TEXT로 정함 (예: "2023-10-01 14:30")';
COMMENT ON COLUMN "cost"."place" IS '지출 장소 (예: "편의점")';
COMMENT ON COLUMN "cost"."total_amount" IS '총 지출 금액 (원 단위)';
COMMENT ON COLUMN "cost"."memo" IS '메모 (빈 값 허용, 추가 설명)';
COMMENT ON COLUMN "cost"."receipt" IS '영수증 텍스트 (OCR 결과, 빈 값 허용)';
COMMENT ON COLUMN "cost"."created_at" IS '생성일시';
COMMENT ON COLUMN "cost"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';
COMMENT ON COLUMN "cost"."receipt_url" IS 's3 링크 (영수증 이미지 저장)';

COMMENT ON TABLE "cost_menu" IS '비용 세부 메뉴: 영수증 항목 분해';
COMMENT ON COLUMN "cost_menu"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "cost_menu"."cost_id" IS '연결된 비용 ID - 비용 삭제 시 메뉴 삭제';
COMMENT ON COLUMN "cost_menu"."menu_name" IS '메뉴가 없는 불친절한 영수증인 경우엔 해당 값이 "전체"로, 1개의 row로 들어감 (예: "커피", "전체")';
COMMENT ON COLUMN "cost_menu"."count" IS '해당 메뉴의 개수';
COMMENT ON COLUMN "cost_menu"."amount" IS '메뉴별 금액 (개별 항목, 수량이 2개이면 2개의 가격으로 표시됨)';
COMMENT ON COLUMN "cost_menu"."must_payer_ids" IS '반정규화. 정산 별 메뉴 별 결제자로 그룹카운트하는데에 시간이 너무 걸릴것같아서 만듬 (배열: [member_id1, member_id2])';
COMMENT ON COLUMN "cost_menu"."created_at" IS '생성일시';
COMMENT ON COLUMN "cost_menu"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

COMMENT ON TABLE "cost_menu_member" IS '레거시: 과거 형식, 현재 사용 안 함 - cost_menu.must_payer_ids로 대체';
COMMENT ON COLUMN "cost_menu_member"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "cost_menu_member"."created_at" IS '생성일시 (레거시)';
COMMENT ON COLUMN "cost_menu_member"."updated_at" IS '수정일시 (트리거로 자동 업데이트, 레거시)';

COMMENT ON TABLE "photo" IS '여행 사진: S3 저장';
COMMENT ON COLUMN "photo"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "photo"."member_id" IS '업로드 멤버 ID - 멤버 삭제 시 사진 삭제';
COMMENT ON COLUMN "photo"."trip_id" IS '연결된 여행 ID - 여행 삭제 시 사진 삭제';
COMMENT ON COLUMN "photo"."s3_url" IS 'S3 저장 URL (AWS S3 버킷 링크)';
COMMENT ON COLUMN "photo"."created_at" IS '생성일시 (업로드 시간)';
COMMENT ON COLUMN "photo"."updated_at" IS '수정일시 (NULL 허용, 편집 시 업데이트)';

COMMENT ON TABLE "memory" IS '여행 추억: NFT/문서 생성';
COMMENT ON COLUMN "memory"."id" IS '자동 증가 ID';
COMMENT ON COLUMN "memory"."member_id" IS '생성 멤버 ID - 멤버 삭제 시 추억 삭제';
COMMENT ON COLUMN "memory"."trip_id" IS '연결된 여행 ID - 여행 삭제 시 추억 삭제';
COMMENT ON COLUMN "memory"."title" IS '추억 제목 (예: "제주 여행 회상")';
COMMENT ON COLUMN "memory"."status" IS '처리 상태 (진행중/완료)';
COMMENT ON COLUMN "memory"."content" IS '임시저장, 콘텐츠 JSON (사진/텍스트 배열)';
COMMENT ON COLUMN "memory"."pdf_url" IS 'PDF URL (문서 생성 결과)';
COMMENT ON COLUMN "memory"."arweave_url" IS 'Arweave 저장 URL (영구 저장소)';
COMMENT ON COLUMN "memory"."nft_id" IS 'NFT ID (민팅 완료 시)';
COMMENT ON COLUMN "memory"."mint_status" IS '민팅 상태 (없음/대기/성공/실패)';
COMMENT ON COLUMN "memory"."mint_hash" IS '트랜잭션 해시 (블록체인 증명)';
COMMENT ON COLUMN "memory"."storage_type" IS '저장 타입 (S3 or Arweave)';
COMMENT ON COLUMN "memory"."created_at" IS '생성일시';
COMMENT ON COLUMN "memory"."updated_at" IS '수정일시 (트리거로 자동 업데이트)';

-- 4. updated_at 자동 업데이트 트리거 함수 (DO 블록 외부로 분리: 안정적 생성)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 모든 테이블에 트리거 수동 적용 (테이블별로 명시: DO 블록 제거로 안정화)
CREATE TRIGGER update_member_updated_at
    BEFORE UPDATE ON "member"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companion_updated_at
    BEFORE UPDATE ON "companion"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thema_updated_at
    BEFORE UPDATE ON "thema"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_updated_at
    BEFORE UPDATE ON "trip"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_member_updated_at
    BEFORE UPDATE ON "trip_member"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_companion_updated_at
    BEFORE UPDATE ON "trip_companion"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_thema_updated_at
    BEFORE UPDATE ON "trip_thema"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_updated_at
    BEFORE UPDATE ON "budget"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_updated_at
    BEFORE UPDATE ON "schedule"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_updated_at
    BEFORE UPDATE ON "location"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_updated_at
    BEFORE UPDATE ON "cost"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_menu_updated_at
    BEFORE UPDATE ON "cost_menu"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_menu_member_updated_at
    BEFORE UPDATE ON "cost_menu_member"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photo_updated_at
    BEFORE UPDATE ON "photo"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memory_updated_at
    BEFORE UPDATE ON "memory"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
