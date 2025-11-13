// 수정 락 관련한 타입만 정의
import { GetLockStateResponse } from '../types/editLockState'
import { AcquireLockStateResponse } from '../types/editLockState'
import { ModifyLockStateResponse } from '../types/editLockState'
import { apiClient } from '@/shared/api/client'

export class EditLockStateService {
  // 1. 수정 락 상태 조회
  public static async getLockState(tripId: number, costId: number): Promise<GetLockStateResponse> {
    const response = await apiClient.get<GetLockStateResponse>(
      `/cost/${tripId}/${costId}/edit-status`
    )
    return response
  }
  // 2. 수정 락 획득
  public static async acquireLockState(
    tripId: number,
    costId: number
  ): Promise<AcquireLockStateResponse> {
    const response = await apiClient.post<AcquireLockStateResponse>(
      `/cost/${tripId}/${costId}/edit-lock`
    )
    return response
  }
  // 3. 수정 락 수정
  public static async modifyLockState(
    tripId: number,
    costId: number
  ): Promise<ModifyLockStateResponse> {
    const response = await apiClient.put<ModifyLockStateResponse>(
      `/cost/${tripId}/${costId}/edit-lock/renew`
    )
    return response
  }
  // 4. 수정 락 해제
  public static async releaseLockState(
    tripId: number,
    costId: number
  ): Promise<AcquireLockStateResponse> {
    const response = await apiClient.delete<AcquireLockStateResponse>(
      `/cost/${tripId}/${costId}/edit-lock`
    )
    return response
  }
}
