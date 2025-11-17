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
  startDate: string
  endDate: string
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

// 페이지 정보
export interface PageInfo {
  currentPage: number
  totalPages: number
  totalCount: number
}

// 여행 목록 조회 응답 (백엔드 실제 형식)
export interface TravelListApiResponse {
  trip: Travel[]
  pageInfo: PageInfo
}

// 여행 목록 조회 응답
export interface TravelListResponse {
  trips: Travel[]
  currentPage: number
  totalPages: number
  totalCount: number
}

// 커서 기반 여행 목록 응답 (무한 스크롤용)
export interface TravelCursorResponse {
  trips: Travel[]
  nextCursor: number | null // 다음 커서 (마지막 trip ID)
  hasMore: boolean // 더 불러올 데이터가 있는지
  totalCount: number // 전체 여행 수
}
