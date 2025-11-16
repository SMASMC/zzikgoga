-- v4 송금 관련 테이블

-- ENUM 타입 먼저 생성 (상태 값 고정 목록)
CREATE TYPE settlement_status AS ENUM (
    'IN_PROGRESSING',
    'PENDING',
    'COMPLETE',
    'PARTITIALLY_FAILED_AT_RECEIVE',
    'PARTITIALLY_FAILED_AT_SEND',
    'FAILED'
);

CREATE TYPE network_detail_status AS ENUM (
    'PENDING',
    'TRANSFERRING',
    'COMPLETED',
    'FAILED'
);

-- settlement 테이블 생성 (기본 키 추가, trip_id 외래 키는 참조 테이블 미지정으로 생략)
CREATE TABLE "settlement" (
                              "id" BIGSERIAL PRIMARY KEY,  -- auto-increment ID
                              "trip_id" BIGINT NOT NULL,   -- 로깅을 위해 외래키 제약 안 씀 (참조 테이블 필요시 추가)
                              "cost_version" SMALLINT NOT NULL DEFAULT 1,  -- 정산이 조금이라도 바뀌면 실제 정산도 새로 초기화되어야 하니
                              "status" settlement_status NOT NULL DEFAULT 'IN_PROGRESSING',  -- 해당 로우는 여행에 대해서 정산이 시작되면 로우가 생성됨. 그래서 기본값이 진행중인것임
                              "fail_count" INT NOT NULL DEFAULT 0,
                              "next_retry_at" TIMESTAMP NULL,
                              "retry_count" INT NOT NULL DEFAULT 0,
                              "created_at" TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                              "updated_at" TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- settlement_transaction 테이블 생성 (실제 은행 이체 기록)
CREATE TABLE "settlement_transaction" (
                                          "id" BIGSERIAL PRIMARY KEY,
                                          "settlement_id" BIGINT NOT NULL,
                                          "target_member_id" BIGINT NOT NULL,
                                          "amount" BIGINT NOT NULL,
                                          "is_to_service" BOOLEAN NOT NULL,
                                          "status" network_detail_status NOT NULL DEFAULT 'TRANSFERRING',
                                          "error_code" VARCHAR(100) NULL,  -- 외부 API에서 내리는 에러코드, 상태가 FAILED라면 값이 채워져있음
                                          "bank_transaction_id" VARCHAR(1000) NULL,  -- 외부 API와의 멱등성을 위함 (중복 요청 방지)
                                          "retry_count" INT NOT NULL DEFAULT 0,
                                          "created_at" TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                          "updated_at" TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                          CONSTRAINT fk_settlement_transaction_settlement FOREIGN KEY ("settlement_id") REFERENCES "settlement"("id")
);

-- settlement_member_transfer 테이블 생성 (회원별 송금 요약)
CREATE TABLE "settlement_member_transfer" (
                                              "id" BIGSERIAL PRIMARY KEY,
                                              "settlement_id" BIGINT NOT NULL,
                                              "member_id" BIGINT NOT NULL,
                                              "send_amount" BIGINT NOT NULL DEFAULT 0,      -- Redis에서 가져온 보낼 총액
                                              "receive_amount" BIGINT NOT NULL DEFAULT 0,   -- Redis에서 가져온 받을 총액
                                              "net_amount" BIGINT NOT NULL,                 -- 순액 (receive - send)
                                              "send_details" JSONB NULL,                    -- Redis sendMap 스냅샷: {"receiverId": amount, ...}
                                              "receive_details" JSONB NULL,                 -- Redis receiveMap 스냅샷: {"senderId": amount, ...}
                                              "send_status" network_detail_status NULL,     -- 송금 상태 (보낼 금액이 있을 때만)
                                              "send_error_code" VARCHAR(100) NULL,          -- 송금 실패 시 에러 코드
                                              "receive_status" network_detail_status NULL,  -- 수신 상태 (받을 금액이 있을 때만)
                                              "receive_error_code" VARCHAR(100) NULL,       -- 수신 실패 시 에러 코드
                                              "created_at" TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                              "updated_at" TIMESTAMP with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                              CONSTRAINT fk_settlement_member_transfer_settlement FOREIGN KEY ("settlement_id") REFERENCES "settlement"("id"),
                                              CONSTRAINT uk_settlement_member UNIQUE ("settlement_id", "member_id")
);

-- 컬럼 주석 추가 (문서화 목적)
COMMENT ON COLUMN "settlement"."trip_id" IS '로깅을 위해 외래키 제약을 안 씀';
COMMENT ON COLUMN "settlement"."cost_version" IS '정산이 조금이라도 바뀌면 실제 정산도 새로 초기화되어야 하니';
COMMENT ON COLUMN "settlement"."status" IS '해당 로우는 여행에 대해서 정산이 시작되면 로우가 생성됨. 그래서 기본값이 진행중인것임';
COMMENT ON COLUMN "settlement_transaction"."error_code" IS '외부 API에서 내리는 에러코드, 상태가 FAILED라면 값이 채워져있음';
COMMENT ON COLUMN "settlement_transaction"."bank_transaction_id" IS '외부 API와의 멱등성을 위함';
COMMENT ON COLUMN "settlement_member_transfer"."send_amount" IS 'Redis에서 가져온 정산 확정 시점의 보낼 총액 (스냅샷)';
COMMENT ON COLUMN "settlement_member_transfer"."receive_amount" IS 'Redis에서 가져온 정산 확정 시점의 받을 총액 (스냅샷)';
COMMENT ON COLUMN "settlement_member_transfer"."net_amount" IS '순액 (receive_amount - send_amount)';

-- updated_at 자동 갱신 트리거 추가 (V0에서 정의한 update_updated_at_column 함수 재사용)
CREATE TRIGGER update_settlement_updated_at
    BEFORE UPDATE ON "settlement"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settlement_transaction_updated_at
    BEFORE UPDATE ON "settlement_transaction"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settlement_member_transfer_updated_at
    BEFORE UPDATE ON "settlement_member_transfer"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
