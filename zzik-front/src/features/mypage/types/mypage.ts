// mypage.ts
// 여행 추가 카드 props 정의

export interface TravelAddCardProps {
  onCreateTravel: () => void
}

// 여행 카드 props 정의
export interface TravelCardProps {
  tripId: number
  title: string
  date: string
  img: string
}

export interface CreateTravelRequest {
  title: string
  start_date: string
  end_date: string
  male_count: number
  female_count: number
  companion_id: number[]
  thema_id: number[]
}

// 여행 정보 (목록 조회 시)
export interface Travel {
  tripId: number // 전역 고유 식별자 (사용자별 연속되지 않을 수 있음: 1, 3, 4, 10 등)
  title: string
  start_date: string
  end_date: string
  thumbnail?: string
  male_count: number
  female_count: number
  companion_id: number[]
  thema_id: number[]
}

// 여행 목록 조회 응답 (백엔드 실제 형식)
export interface TravelListApiResponse {
  trip: Travel[]
}

// 여행 목록 조회 응답
export type TravelListResponse = Travel[]
