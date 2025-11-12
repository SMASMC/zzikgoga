import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import CloseButton from '@/components/atoms/CloseButton'
import { CostDetailService } from '../services/costService'
import { CostDetailResponse } from '../types/cost'
import { PlanService } from '@/features/plan/services/planServices'
import { Members } from '@/features/plan/types/plan'

interface CostDetailModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  costId: number
}

const CostDetailModal = ({ isOpen, onClose, tripId, costId }: CostDetailModalProps) => {
  const [costDetail, setCostDetail] = useState<CostDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<Members[]>([])

  // 멤버 목록 로드
  useEffect(() => {
    if (isOpen && tripId) {
      const loadMembers = async () => {
        try {
          const response = await PlanService.getTripMembers(Number(tripId))
          setMembers(response.members)
        } catch (err) {
          console.error('멤버 목록 불러오기 실패:', err)
        }
      }
      loadMembers()
    } else {
      setMembers([])
    }
  }, [isOpen, tripId])

  // 초기 로드
  useEffect(() => {
    if (isOpen && tripId && costId) {
      const loadCostDetail = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await CostDetailService.getCostDetail(Number(tripId), costId)
          setCostDetail(response)
        } catch (err) {
          console.error('비용 상세 불러오기 실패:', err)
          setError('비용 상세 정보를 불러오는데 실패했습니다.')
        } finally {
          setIsLoading(false)
        }
      }
      loadCostDetail()
    } else {
      setCostDetail(null)
      setError(null)
    }
  }, [isOpen, tripId, costId])

  // 1분마다 자동으로 GET 요청 (polling)
  useEffect(() => {
    if (!isOpen || !tripId || !costId) return

    const pollCostDetail = async () => {
      try {
        // 지금 여기서 GET 요청을 보내고 있는데, 
        // 사실은 수정 상태 조회 요청을 보낼 예정!!
        const response = await CostDetailService.getCostDetail(Number(tripId), costId)
        console.log('비용 상세 polling 성공:', response)
      } catch (err) {
        console.error('비용 상세 polling 실패:', err)
        // polling 실패 시 에러를 표시하지 않고 조용히 실패
      }
    }

    // 1분(60000ms)마다 요청
    const intervalId = setInterval(pollCostDetail, 60000)

    // cleanup: 모달이 닫히거나 컴포넌트가 unmount되면 interval 정리
    return () => {
      clearInterval(intervalId)
    }
  }, [isOpen, tripId, costId])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } catch {
      return dateString
    }
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  // 멤버 ID로 이름 찾기
  const getMemberName = (memberId: number): string => {
    const member = members.find((m) => m.memberId === memberId)
    return member?.memberName || `ID: ${memberId}`
  }

  const getMemberThumbnailUrl = (memberId: number): string => {
    const member = members.find((m) => m.memberId === memberId)
    return member?.thumbnailUrl || `ID: ${memberId}`
  }
  

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[100] p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-md sm:max-w-lg bg-gradient-to-br from-white via-background-500 to-background-600 rounded-3xl shadow-xl p-6 sm:p-8 font-bmjua max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-500 font-bmjua">결제 내역 상세</h2>
          <CloseButton onClick={onClose} className="absolute top-3 right-4" />
        </div>

        {/* Modal Body */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : costDetail ? (
            <>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-bold text-text-500">기본 정보</h3>

                <div>
                  <p className="text-sm text-text-600 mb-1">결제자</p>
                  <p className="text-base font-semibold text-text-500">{getMemberName(costDetail.payerId)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-text-600 mb-1">결제 일시</p>
                  <p className="text-base font-semibold text-text-500">{formatDate(costDetail.paidAt)}</p>
                </div>

                <div>
                  <p className="text-sm text-text-600 mb-1">결제 금액</p>
                  <p className="text-lg font-bold text-blue-600">{formatAmount(costDetail.totalAmount)}원</p>
                </div>

                <div>
                  <p className="text-sm text-text-600 mb-1">장소</p>
                  <p className="text-base font-semibold text-text-500">{costDetail.place}</p>
                </div>

                {costDetail.memo && (
                  <div>
                    <p className="text-sm text-text-600 mb-1">메모</p>
                    <p className="text-base text-text-500">{costDetail.memo}</p>
                  </div>
                )}
              </div>

              {costDetail.items && costDetail.items.length > 0 && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="text-lg font-bold text-text-500">상세 정보</h3>
                  <div className="space-y-2">
                    {costDetail.items.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold text-text-500">{item.menuName}</p>
                          <p className="font-bold text-blue-600">{formatAmount(item.amount)}원</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-600">
                          <span>수량: {item.count}</span>
                          {item.memberIds && item.memberIds.length > 0 && (
                            <span>• 참여자: {item.memberIds.length}명</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default CostDetailModal