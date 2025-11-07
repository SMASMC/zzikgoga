import { apiClient } from '@/shared/api/client'
import { FriendInviteResponse, TripMemberResponse, InviteResponse } from '../types/plan'
import { getCookie } from '@/shared/utils/cookie' // 디버깅용

export class PlanService {
  public static async inviteFriend(tripId: number): Promise<FriendInviteResponse> {
    const response = await apiClient.post<FriendInviteResponse>(`/plan/${tripId}/invite`)
    return response
  }
  public static async getTripMembers(tripId: number): Promise<TripMemberResponse> {
    const response = await apiClient.get<TripMemberResponse>(`/user/trip/${tripId}/members`)
    return response
  }
  // 초대 수락 API: Authorization 헤더(사용자 인증) + body의 token(초대 토큰)
  public static async acceptInvite(token: string): Promise<InviteResponse> {
    console.log('acceptInvite 호출 시작')
    console.log('쿠키 확인:', getCookie('accessToken') ? '있음' : '없음')

    // apiClient를 사용하여 자동으로 Authorization 헤더 처리
    const response = await apiClient.post<InviteResponse>('/plan/invite/accept', {
      token, // 초대 토큰을 body에 포함
    })

    console.log('✅ 초대 수락 API 응답:', response)
    return response
  }
}
