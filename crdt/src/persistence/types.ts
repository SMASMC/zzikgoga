// DB 테이블 타입 정의 (DTO, Entity)
//LF 변환

// PostgreSQL에서 SELECT한 결과의 타입
// (ERD를 기반으로 필수적인 타입만 정의)

export interface Trip {
  id: number;
  title: string;
  start_date: string; // (Date 객체지만 string으로 변환됨)
  end_date: string;
  updated_at: string;
}

export interface Schedule {
  id: number;
  trip_id: number;
  start_time: string; // (DATETIME은 string으로 가져옴)
  offset_time: string;
  memo: string | null;
  has_location: boolean;
  updated_at: string;
}

export interface Location {
  id: number;
  schedule_id: number;
  name: string;
  full_address: string;
  detail: string;
  latitude: number;
  longitude: number;
}

export interface Budget {
  id: number;
  trip_id: number;
  date: string; // (DATE는 string으로 가져옴)
  category: string;
  description: string | null;
  amount: number;
}