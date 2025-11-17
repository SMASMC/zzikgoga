import { apiClient } from '@/shared/api/client'
import {
  CreateTravelRequest,
  TravelListResponse,
  TravelListApiResponse,
  TravelCursorResponse,
} from '../types/mypage'

/**
 * 여행 관련 API 서비스
 */
export class TravelService {
  /**
   * 여행 목록 조회 (페이지네이션)
   * @param page - 페이지 번호 (1부터 시작)
   * @param size - 페이지 크기 (기본값: 7)
   * @returns 여행 목록 및 페이지 정보
   */
  public static async getTravelList(
    page: number = 1,
    size: number = 7
  ): Promise<TravelListResponse> {
    const params: Record<string, string> = {
      page: String(page),
      size: String(size),
    }
    console.log('🌐 API Call - page:', page, 'size:', size, 'params:', JSON.stringify(params))

    const response = await apiClient.get<TravelListApiResponse>('/plan', params)
    return {
      trips: response.trip || [],
      currentPage: response.pageInfo?.currentPage ?? 1,
      totalPages: response.pageInfo?.totalPages ?? 1,
      totalCount: response.pageInfo?.totalCount ?? 0,
    }
  }

  /**
   * 여행 목록 조회 (커서 기반 - 무한 스크롤용)
   * @param cursor - 커서 (이전 요청의 마지막 여행 ID)
   * @param size - 페이지 크기 (기본값: 10)
   * @returns 여행 목록 및 다음 커서 정보
   */
  public static async getTravelListWithCursor(
    cursor: number | null = null,
    size: number = 10
  ): Promise<TravelCursorResponse> {
    const params: Record<string, string> = {
      size: String(size),
    }
    if (cursor !== null) {
      params.cursor = String(cursor)
    }

    console.log('🔄 Cursor API Call - cursor:', cursor, 'size:', size, 'params:', params)

    const response = await apiClient.get<TravelCursorResponse>('/plan/cursor', params)
    return response
  }

  /**
   * 여행 생성
   * @param data CreateTravelRequest 데이터
   * @returns 생성된 여행 정보
   */
  public static async createTravel(data: CreateTravelRequest): Promise<unknown> {
    const response = await apiClient.post<unknown>('/plan', data)
    return response
  }
}
