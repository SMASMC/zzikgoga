-- ENUM 타입 정의 (PostgreSQL 전용)
CREATE TYPE provider_type AS ENUM('KAKAO', 'GOOGLE', 'NAVER');
CREATE TYPE gender_type AS ENUM('MALE', 'FEMALE');
CREATE TYPE budget_category_type AS ENUM('STAY', 'FOOD', 'TRANSPORT', 'SHOPPING', 'LEISURE', 'ETC');
CREATE TYPE memory_status_type AS ENUM('onprocess', 'completed');
CREATE TYPE mint_status_type AS ENUM('none', 'pending', 'success', 'failed');
CREATE TYPE storage_type_type AS ENUM('s3', 'arweave');

-- trip_thema 테이블
CREATE TABLE trip_thema (
                            id BIGSERIAL PRIMARY KEY,
                            trip_id BIGINT NOT NULL,
                            thema_id BIGINT NOT NULL,
                            created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN trip_thema.trip_id IS 'FK to trip.id';
COMMENT ON COLUMN trip_thema.thema_id IS 'FK to thema.id';

-- cost_menu_member 테이블
CREATE TABLE cost_menu_member (
                                  id BIGSERIAL PRIMARY KEY,
                                  member_id BIGINT NOT NULL,
                                  cost_menu_id BIGINT NOT NULL,
                                  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN cost_menu_member.member_id IS 'FK to member.id';
COMMENT ON COLUMN cost_menu_member.cost_menu_id IS 'FK to cost_menu.id';

-- memory 테이블
CREATE TABLE memory (
                        id BIGSERIAL PRIMARY KEY,
                        member_id BIGINT NOT NULL,
                        trip_id BIGINT NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        status memory_status_type DEFAULT 'onprocess' NOT NULL,
                        content JSONB,
                        pdf_url VARCHAR(1024),
                        arweave_url VARCHAR(1024),
                        nft_id VARCHAR(255),
                        mint_status mint_status_type DEFAULT 'none' NOT NULL,
                        mint_hash VARCHAR(255),
                        storage_type storage_type_type,
                        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN memory.content IS '임시저장';
COMMENT ON COLUMN memory.member_id IS 'FK to member.id';
COMMENT ON COLUMN memory.trip_id IS 'FK to trip.id';

-- companion 테이블 (Companion → companion)
CREATE TABLE companion (
                           id BIGSERIAL PRIMARY KEY,
                           name VARCHAR(50) NOT NULL,
                           created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- trip_companion 테이블
CREATE TABLE trip_companion (
                                id BIGSERIAL PRIMARY KEY,
                                trip_id BIGINT NOT NULL,
                                companion_id BIGINT NOT NULL,
                                created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN trip_companion.trip_id IS 'FK to trip.id';
COMMENT ON COLUMN trip_companion.companion_id IS 'FK to companion.id';

-- trip_member 테이블
CREATE TABLE trip_member (
                             id BIGSERIAL PRIMARY KEY,
                             trip_id BIGINT NOT NULL,
                             member_id BIGINT NOT NULL,
                             is_cost_accepted BOOLEAN DEFAULT FALSE NOT NULL,
                             created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN trip_member.trip_id IS 'FK to trip.id';
COMMENT ON COLUMN trip_member.member_id IS 'FK to member.id';

-- member 테이블
CREATE TABLE member (
                        id BIGSERIAL PRIMARY KEY,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        password VARCHAR(128),
                        provider provider_type NOT NULL,
                        provider_id VARCHAR(128) NOT NULL,
                        name VARCHAR(50) NOT NULL,
                        gender gender_type NOT NULL,
                        birth_year SMALLINT NOT NULL,
                        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        bank_code VARCHAR(50) NOT NULL,
                        account_num VARCHAR(100) NOT NULL,
                        thumbnail_url VARCHAR(1024),
                        wallet_address VARCHAR(255) DEFAULT '' NOT NULL,
                        wallet_private_key VARCHAR(1024) DEFAULT '' NOT NULL,  -- 보안: 암호화 저장 필수
                        remaining_arweave_uses SMALLINT DEFAULT 1 NOT NULL
);
COMMENT ON COLUMN member.password IS 'Argon2로 단방향 암호화, 추후 자체 로그인 확장성을 고려하기 위해 nullable로 만들어둠';
COMMENT ON COLUMN member.provider IS 'Unique, 현 개발에선 카카오로만 사용';
COMMENT ON COLUMN member.provider_id IS 'Unique';
COMMENT ON COLUMN member.birth_year IS '카카오 oauth로 출생년도 받아옴';
COMMENT ON COLUMN member.bank_code IS '노션의 mapping 페이지 참고';
COMMENT ON COLUMN member.thumbnail_url IS 'null이라면 우리 서비스에서 만든 이름기반 썸네일로';
COMMENT ON COLUMN member.wallet_private_key IS '블록체인 지갑: Spring Security로 암호화';
COMMENT ON COLUMN member.remaining_arweave_uses IS '유저별 추억 영구저장 가능 남은 횟수';
-- trip 테이블
CREATE TABLE trip (
                      id BIGSERIAL PRIMARY KEY,
                      owner_id BIGINT NOT NULL,
                      title VARCHAR(100) NOT NULL,
                      start_date DATE NOT NULL,
                      end_date DATE NOT NULL,
                      male_count SMALLINT DEFAULT 0 NOT NULL,
                      female_count SMALLINT DEFAULT 0 NOT NULL,
                      is_cost_completed BOOLEAN DEFAULT FALSE NOT NULL,
                      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN trip.owner_id IS 'FK to member.id';

-- thema 테이블 (Thema → thema)
CREATE TABLE thema (
                       id BIGSERIAL PRIMARY KEY,
                       name VARCHAR(50) NOT NULL UNIQUE,
                       created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- cost_menu 테이블
CREATE TABLE cost_menu (
                           id BIGSERIAL PRIMARY KEY,
                           cost_id BIGINT NOT NULL,
                           menu_name VARCHAR(200) NOT NULL,
                           amount BIGINT NOT NULL,
                           created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           n_cost_menu_member SMALLINT DEFAULT 0 NOT NULL
);
COMMENT ON COLUMN cost_menu.menu_name IS '메뉴가 없는 불친절한 영수증인 경우엔 해당 값이 \"전체\"로, 1개의 row로 들어감';
COMMENT ON COLUMN cost_menu.n_cost_menu_member IS '반정규화. 정산 별 메뉴 별 결제자로 그룹카운트하는데에 시간이 너무 걸릴것같아서 만듬';
COMMENT ON COLUMN cost_menu.cost_id IS 'FK to cost.id';

-- photo 테이블
CREATE TABLE photo (
                       id BIGSERIAL PRIMARY KEY,  -- DEFAULT FALSE 수정: BIGSERIAL로 자동 증가
                       member_id BIGINT NOT NULL,
                       trip_id BIGINT NOT NULL,
                       s3_url VARCHAR(1024),  -- DEFAULT FALSE 수정: NULL 허용
                       is_cost BOOLEAN DEFAULT FALSE NOT NULL,
                       created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                       updated_at TIMESTAMP WITHOUT TIME ZONE
);
COMMENT ON COLUMN photo.member_id IS 'FK to member.id';
COMMENT ON COLUMN photo.trip_id IS 'FK to trip.id';

-- budget 테이블 (Budget → budget)
CREATE TABLE budget (
                        id BIGSERIAL PRIMARY KEY,
                        trip_id BIGINT NOT NULL,
                        date DATE NOT NULL,
                        category budget_category_type NOT NULL,
                        description TEXT,
                        amount NUMERIC(12,0) DEFAULT 0 NOT NULL,
                        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN budget.trip_id IS 'FK to trip.id';

-- schedule 테이블
CREATE TABLE schedule (
                          id BIGSERIAL PRIMARY KEY,
                          trip_id BIGINT NOT NULL,
                          start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                          offset_time INTERVAL NOT NULL,
                          memo VARCHAR(1000),
                          created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          has_location BOOLEAN DEFAULT FALSE NOT NULL
);
COMMENT ON COLUMN schedule.offset_time IS 'interval이 시간계산을 쉽게 해주는 자료형이라함';
COMMENT ON COLUMN schedule.has_location IS '반정규화';
COMMENT ON COLUMN schedule.trip_id IS 'FK to trip.id';

-- location 테이블
CREATE TABLE location (
                          id BIGSERIAL PRIMARY KEY,
                          schedule_id BIGINT NOT NULL,
                          name VARCHAR(200) NOT NULL,
                          sido VARCHAR(20) NOT NULL,
                          sigungu VARCHAR(20) NOT NULL,
                          road_name VARCHAR(100) NOT NULL,
                          building_num VARCHAR(10) NOT NULL,
                          detail VARCHAR(100),
                          full_address TEXT NOT NULL,
                          latitude DOUBLE PRECISION,
                          longitude DOUBLE PRECISION,  -- 오타 수정: longtitude → longitude
                          created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN location.full_address IS '표시용 / 전체 도로명주소';
COMMENT ON COLUMN location.latitude IS '추후 위경도 기능 확장용';
COMMENT ON COLUMN location.longitude IS '추후 위경도 기능 확장용';
COMMENT ON COLUMN location.schedule_id IS 'FK to schedule.id';

-- cost 테이블
CREATE TABLE cost (
                      id BIGSERIAL PRIMARY KEY,
                      trip_id BIGINT NOT NULL,
                      created_by BIGINT NOT NULL,
                      payer_id BIGINT NOT NULL,
                      paid_at TEXT NOT NULL,  -- TIMESTAMP로 변경 추천, 하지만 OCR 형식 유지
                      place VARCHAR(200) NOT NULL,
                      total_amount BIGINT NOT NULL,
                      memo TEXT,
                      receipt TEXT NOT NULL,
                      created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                      updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON COLUMN cost.paid_at IS 'OCR 인식의 형식 불일치 한계로 인해 정렬기능 미제공으로 고려하여 TEXT로 정함';
COMMENT ON COLUMN cost.trip_id IS 'FK to trip.id';
COMMENT ON COLUMN cost.created_by IS 'FK to member.id';
COMMENT ON COLUMN cost.payer_id IS 'FK to member.id';

-- 외래키 제약조건 추가 (무결성 보장)
ALTER TABLE trip_thema ADD CONSTRAINT fk_trip_thema_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE trip_thema ADD CONSTRAINT fk_trip_thema_thema FOREIGN KEY (thema_id) REFERENCES thema(id);
ALTER TABLE cost_menu_member ADD CONSTRAINT fk_cost_menu_member_member FOREIGN KEY (member_id) REFERENCES member(id);
ALTER TABLE cost_menu_member ADD CONSTRAINT fk_cost_menu_member_menu FOREIGN KEY (cost_menu_id) REFERENCES cost_menu(id);
ALTER TABLE memory ADD CONSTRAINT fk_memory_member FOREIGN KEY (member_id) REFERENCES member(id);
ALTER TABLE memory ADD CONSTRAINT fk_memory_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE trip_companion ADD CONSTRAINT fk_trip_companion_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE trip_companion ADD CONSTRAINT fk_trip_companion_companion FOREIGN KEY (companion_id) REFERENCES companion(id);
ALTER TABLE trip_member ADD CONSTRAINT fk_trip_member_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE trip_member ADD CONSTRAINT fk_trip_member_member FOREIGN KEY (member_id) REFERENCES member(id);
ALTER TABLE trip ADD CONSTRAINT fk_trip_owner FOREIGN KEY (owner_id) REFERENCES member(id);
ALTER TABLE cost_menu ADD CONSTRAINT fk_cost_menu_cost FOREIGN KEY (cost_id) REFERENCES cost(id);
ALTER TABLE photo ADD CONSTRAINT fk_photo_member FOREIGN KEY (member_id) REFERENCES member(id);
ALTER TABLE photo ADD CONSTRAINT fk_photo_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE budget ADD CONSTRAINT fk_budget_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE schedule ADD CONSTRAINT fk_schedule_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE location ADD CONSTRAINT fk_location_schedule FOREIGN KEY (schedule_id) REFERENCES schedule(id);
ALTER TABLE cost ADD CONSTRAINT fk_cost_trip FOREIGN KEY (trip_id) REFERENCES trip(id);
ALTER TABLE cost ADD CONSTRAINT fk_cost_created_by FOREIGN KEY (created_by) REFERENCES member(id);
ALTER TABLE cost ADD CONSTRAINT fk_cost_payer FOREIGN KEY (payer_id) REFERENCES member(id);
