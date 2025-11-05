// mypage.ts
// 여행 추가 카드 props 정의

export interface TravelAddCardProps {
  onCreateTravel: () => void
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
  id: number
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
