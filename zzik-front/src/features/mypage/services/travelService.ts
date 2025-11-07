import { apiClient } from '@/shared/api/client'
import { CreateTravelRequest, TravelListResponse, TravelListApiResponse } from '../types/mypage'

/**
 * 여행 관련 API 서비스
 */
export class TravelService {
  /**
   * 여행 목록 조회
   * @returns 여행 목록
   */
  public static async getTravelList(): Promise<TravelListResponse> {
    const response = await apiClient.get<TravelListApiResponse>('/plan')
    console.log('여행 목록 조회 완료:', response.trip?.length || 0, '개')
    console.log('여행 목록:', response.trip)
    return response.trip
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
