--V4__create_tables_about_settlements.sql

-- 1. ENUM 타입 먼저 생성
CREATE TYPE settlement_status AS ENUM (
    'IN_PROGRESSING',
    'PENDING',
    'COMPLETE',
    'PARTITIALLY_FAILED_AT_RECEIVE',
    'PARTITIALLY_FAILED_AT_SEND',
    'FAILED'
);

-- 2. 테이블 생성
CREATE TABLE cost_settlement (
                                 id BIGSERIAL PRIMARY KEY,
                                 trip_id BIGINT NOT NULL,
                                 status settlement_status DEFAULT 'IN_PROGRESSING' NOT NULL,
                                 fail_count INT DEFAULT 0 NOT NULL,
                                 next_retry_at TIMESTAMP NULL,
                                 retry_count INT DEFAULT 0 NOT NULL,
                                 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                 updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 컬럼 코멘트
COMMENT ON COLUMN cost_settlement.status IS '해당 로우는 여행에 대해서 정산이 시작되면 로우가 생성됨. 그래서 기본값이 진행중인것임';
COMMENT ON COLUMN trip_id IS 'trip 이 사라져도 로그용으로 남기기위해서 외부키 제약을 걸지 않음';
-- 1. ENUM 타입 생성
CREATE TYPE transfer_status AS ENUM (
    'PENDING',
    'CHECKING_BALANCE',
    'BALANCE_OK',
    'TRANSFERRING',
    'COMPLETED',
    'FAILED'
);

-- 2. 테이블 생성
CREATE TABLE cost_transfer (
                               id BIGSERIAL PRIMARY KEY,
                               cost_settlement_id BIGINT NOT NULL,
                               target_member_id BIGINT NOT NULL,
                               amount INT NOT NULL,
                               is_to_service BOOLEAN NOT NULL,
                               status transfer_status DEFAULT 'TRANSFERRING' NOT NULL,
                               error_code VARCHAR(100) NULL,
                               bank_transaction_id VARCHAR(1000) NULL,
                               retry_count INT DEFAULT 0 NOT NULL,
                               created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 외래키 제약조건
                               CONSTRAINT fk_cost_transfer_settlement
                                   FOREIGN KEY (cost_settlement_id)
                                       REFERENCES cost_settlement(id)
                                       ON DELETE CASCADE,

    -- 멱등성 보장을 위한 유니크 제약
                               CONSTRAINT uk_cost_transfer_bank_transaction_id
                                   UNIQUE (bank_transaction_id)
);

-- 3. 컬럼 코멘트
COMMENT ON COLUMN cost_transfer.error_code IS '외부 api에서 내리는 에러코드, 상태가 FAILED이라면 값이 채워져있음';
COMMENT ON COLUMN cost_transfer.bank_transaction_id IS '외부 api와의 멱등성을 위함';
