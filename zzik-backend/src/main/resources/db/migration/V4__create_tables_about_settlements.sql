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

-- settlement_network 테이블 생성 (외래 키 추가)
CREATE TABLE "settlement_network" (
                                      "id" BIGSERIAL PRIMARY KEY,
                                      "settlement_id" BIGINT NOT NULL,
                                      "sender_id" BIGINT NOT NULL,
                                      "receive_id" BIGINT NOT NULL,
                                      "amount" INT NOT NULL,
                                      "created_at" TIMESTAMP with time NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      "updated_at" TIMESTAMP with time NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                      CONSTRAINT fk_settlement_network_settlement FOREIGN KEY ("settlement_id") REFERENCES "settlement"("id")
);

-- settlement_network_detail 테이블 생성 (외래 키 추가)
CREATE TABLE "settlement_network_detail" (
                                             "id" BIGSERIAL PRIMARY KEY,
                                             "settlement_network_id" BIGINT NOT NULL,
                                             "target_member_id" BIGINT NOT NULL,
                                             "amount" INT NOT NULL,
                                             "is_to_service" BOOLEAN NOT NULL,
                                             "status" network_detail_status NOT NULL DEFAULT 'TRANSFERRING',
                                             "error_code" VARCHAR(100) NULL,  -- 외부 API에서 내리는 에러코드, 상태가 FAILED라면 값이 채워져있음
                                             "bank_transaction_id" VARCHAR(1000) NULL,  -- 외부 API와의 멱등성을 위함 (중복 요청 방지)
                                             "retry_count" INT NOT NULL DEFAULT 0,
                                             "created_at" TIMESTAMP with time NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                             "updated_at" TIMESTAMP with time NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                             CONSTRAINT fk_settlement_network_detail_network FOREIGN KEY ("settlement_network_id") REFERENCES "settlement_network"("id")
);

-- 컬럼 주석 추가 (문서화 목적)
COMMENT ON COLUMN "settlement"."trip_id" IS '로깅을 위해 외래키 제약을 안 씀';
COMMENT ON COLUMN "settlement"."cost_version" IS '정산이 조금이라도 바뀌면 실제 정산도 새로 초기화되어야 하니';
COMMENT ON COLUMN "settlement"."status" IS '해당 로우는 여행에 대해서 정산이 시작되면 로우가 생성됨. 그래서 기본값이 진행중인것임';
COMMENT ON COLUMN "settlement_network_detail"."error_code" IS '외부 API에서 내리는 에러코드, 상태가 FAILED라면 값이 채워져있음';
COMMENT ON COLUMN "settlement_network_detail"."bank_transaction_id" IS '외부 API와의 멱등성을 위함';
