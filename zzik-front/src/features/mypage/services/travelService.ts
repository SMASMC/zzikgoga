import { apiClient } from '@/shared/api/client'
import { CreateTravelRequest, TravelListResponse, TravelListApiResponse } from '../types/mypage'

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
   * 여행 생성
   * @param data CreateTravelRequest 데이터
   * @returns 생성된 여행 정보
   */
  public static async createTravel(data: CreateTravelRequest): Promise<unknown> {
    const response = await apiClient.post<unknown>('/plan', data)
    return response
  }
}
