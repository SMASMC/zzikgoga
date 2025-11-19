-- location 의 칼럼을 null 가능하게 수정

ALTER TABLE location
    ALTER COLUMN sido DROP NOT NULL,
    ALTER COLUMN sigungu DROP NOT NULL,
    ALTER COLUMN road_name DROP NOT NULL,
    ALTER COLUMN building_num DROP NOT NULL;
