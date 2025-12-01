-- 계좌 정보를 회원가입 시 선택사항으로 변경
-- 정산 기능 사용 시 계좌 정보 입력 필요

ALTER TABLE "member" ALTER COLUMN "bank_code" DROP NOT NULL;
ALTER TABLE "member" ALTER COLUMN "account_num" DROP NOT NULL;

COMMENT ON COLUMN "member"."bank_code" IS '은행 코드 (노션의 mapping 페이지 참고) - 선택사항, 정산 시 필요';
COMMENT ON COLUMN "member"."account_num" IS '계좌번호 (정산 송금용) - 선택사항, 정산 시 필요';
