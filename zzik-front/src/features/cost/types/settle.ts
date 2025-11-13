// settle.ts
// 정산 수락 및 개인별 정산 내역 관련 타입 정리

// 1. 정산 수락한 사람들 목록 조회
export interface SettleMember {
  memberId: number
  memberName: string
  thumbnailUrl: string
  acceptedAt?: string
}

export interface SettleResponse {
  tripId: number
  acceptedMembers: SettleMember[]
  notAcceptedMembers: SettleMember[]
  acceptedCount: number
  totalMemberCount: number
  acceptanceRate: number
}

// 2. 개인별 정산 수락 요청
export interface SettleAcceptRequest {
  accept: boolean
}

export interface SettleAcceptResponse {
  memberId: number
  isAccepted: boolean
  acceptedAt: string
}

// 3. 최종 개인별 정산 내역 조회
export interface SettleFinalResponse {
  combinedSettlement: SettleDetail[]
}
export interface SettleDetail {
  memberId: number
  memberName: string
  memberCount: number
  toSend: SendMember[]
  toReceive: ReceiveMember[]
  netAmount: number
}
export interface SendMember {
  targetMemberId: number
  targetMemberName: string
  amount: number
}
export interface ReceiveMember {
  fromMemberId: number
  fromMemberName: string
  amount: number
}

