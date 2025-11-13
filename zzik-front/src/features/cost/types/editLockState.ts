// 수정 락 관련 api 요청 / 응답 정리

// 1. 수정 락 상태 조회 (GET)
export interface GetLockStateResponse {
  costId: number
  isEditing: boolean
  editingMember: EditingMember[] | null
  editingStartedAt: string | null
  canEdit: boolean
}
export interface EditingMember {
  memberId: number
  memberName: string
  thumbnailUrl: string
}

// 2. 수정 락 획득 / 해제 (POST / DELETE)
export interface AcquireLockStateResponse {
  costId: number
  lockAcquired: boolean
  lockExpireAt: string
  message: string
}

// 3. 수정 락 갱신 (PUT)
export interface ModifyLockStateResponse {
  costId: number
  lockExpireAt: string
  message: string
}
