import { apiClient } from '@/shared/api/client'
import { FriendInviteResponse, TripMemberResponse, InviteResponse } from '../types/plan'

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
    const response = await apiClient.post<InviteResponse>('/plan/invite/accept', {
      token, // 초대 토큰을 body에 포함
    })
    return response
  }
}
