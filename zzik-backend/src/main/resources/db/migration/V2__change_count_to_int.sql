-- V2__change_count_to_int.sql
-- cost_menu 테이블의 count 컬럼을 SMALLINT에서 INT로 변경
ALTER TABLE "cost_menu"
ALTER COLUMN "count" TYPE INT USING "count"::INT;
