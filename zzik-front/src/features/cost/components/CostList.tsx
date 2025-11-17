// CostList.tsx
// 정산 리스트 컴포넌트
// 전체 정산 내역 및 상세 조회
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CostListService, CostDetailService, CostSettleService } from '../services/costService'
import { CostListResponse } from '../types/cost'
import { SettleResponse } from '../types/settle'
import CostDetailModal from './CostDetailModal'
import SolidButton from '@/components/atoms/SolidButton'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { ToastDock } from '@/components/blocks/ToastDock'

interface CostListProps {
  tripId: string
  onRefresh?: number
}

const CostList = ({ tripId, onRefresh }: CostListProps) => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [costs, setCosts] = useState<CostListResponse[]>([])
  const [totalCostCount, setTotalCostCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCostId, setSelectedCostId] = useState<number | null>(null)
  const [deletingCostId, setDeletingCostId] = useState<number | null>(null)
  const [isSettling, setIsSettling] = useState(false)
  const [settleInfo, setSettleInfo] = useState<SettleResponse | null>(null)
  const [showSettleTooltip, setShowSettleTooltip] = useState(false)
  const [toast, setToast] = useState<{
    open: boolean
    variant: 'success' | 'warning' | 'error' | 'hint'
    message: string
  }>({ open: false, variant: 'success', message: '' })

  // 현재 사용자가 이미 수락했는지 확인
  const isAlreadyAccepted = settleInfo
    ? settleInfo.acceptedMembers.some((member) => member.memberId === Number(user?.id))
    : false

  const loadCostList = async () => {
    setIsLoading(true)
    try {
      const response = await CostListService.getCostList(tripId)
      setCosts(response.costs)
      setTotalCostCount(response.totalCostCount)
    } catch (error) {
      console.error('비용 목록 불러오기 실패:', error)
      setCosts([])
      setTotalCostCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  // 정산 상태 조회
  const loadSettleInfo = async () => {
    if (!tripId) return
    try {
      const response = await CostSettleService.getSettle(Number(tripId))
      setSettleInfo(response)
    } catch (error) {
      console.error('정산 상태 조회 실패:', error)
    }
  }

  useEffect(() => {
    if (tripId) {
      loadCostList()
      loadSettleInfo()
    }
  }, [tripId])

  // onRefresh prop이 변경되면 목록 및 정산 내역 새로고침
  useEffect(() => {
    if (onRefresh !== undefined && tripId) {
      loadCostList()
      loadSettleInfo()
    }
  }, [onRefresh, tripId])

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

  const handleCostClick = (costId: number) => {
    setSelectedCostId(costId)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedCostId(null)
  }

  const handleDelete = async (e: React.MouseEvent, costId: number) => {
    e.stopPropagation() // 클릭 이벤트 버블링 방지 (모달이 열리지 않도록)

    if (!confirm('정말로 이 결제 내역을 삭제하시겠습니까?')) {
      return
    }

    setDeletingCostId(costId)
    try {
      await CostDetailService.deleteCost(Number(tripId), costId)
      // 삭제 성공 시 목록 새로고침
      await loadCostList()
    } catch (error) {
      console.error('결제 내역 삭제 실패:', error)
      setToast({
        open: true,
        variant: 'error',
        message: '결제 내역 삭제에 실패했습니다. 다시 시도해주세요.',
      })
    } finally {
      setDeletingCostId(null)
    }
  }

  // 총 결제 금액 계산 (각 항목의 합계)
  const calculatedTotalAmount = costs.reduce((sum, cost) => sum + cost.totalAmount, 0)

  const handleSettle = async () => {
    setIsSettling(true)
    try {
      await CostSettleService.acceptSettle(Number(tripId), { accept: true })
      // 정산 상태 다시 조회
      await loadSettleInfo()
      setToast({ open: true, variant: 'success', message: '정산 수락이 완료되었습니다.' })
    } catch (error) {
      console.error('정산 수락 실패:', error)
      setToast({
        open: true,
        variant: 'error',
        message: '정산 수락에 실패했습니다. 다시 시도해주세요.',
      })
    } finally {
      setIsSettling(false)
    }
  }

  const handleViewFinal = () => {
    navigate(`/cost/${tripId}/final`)
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-text-500 font-bmjua">정산 내역</h2>
          <SolidButton onClick={handleViewFinal} size="sm" className="flex-shrink-0">
            정산 결과 확인하기
          </SolidButton>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-text-600">총 건수: </span>
            <span className="font-bold text-blue-600">{totalCostCount}건</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : costs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">정산 내역이 없습니다.</div>
      ) : (
        <>
          <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto custom-scrollbar mb-4">
            {costs.map((cost) => (
              <div
                key={cost.costId}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleCostClick(cost.costId)
                }}
                className="relative z-10 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer touch-manipulation active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="flex-shrink-0">
                      {cost.payerThumbnailUrl ? (
                        <img
                          src={cost.payerThumbnailUrl}
                          alt={cost.payerName}
                          className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-400">
                          <span className="text-white font-bold text-lg">
                            {cost.payerName.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-text-500 truncate">{cost.payerName}</p>
                        <span className="text-xs text-text-600">결제</span>
                        {/* <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                        //   {/* {COST_CATEGORY_LABELS[cost.category]} */}
                        {/* // </span>  */}
                      </div>
                      <p className="text-sm text-text-600 truncate">{cost.place}</p>
                      <p className="text-xs text-gray-500">{formatDate(cost.paidAt)}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 flex items-center gap-3">
                    <p className="text-lg font-bold text-blue-600">
                      {formatAmount(cost.totalAmount)}원
                    </p>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, cost.costId)}
                      disabled={deletingCostId === cost.costId}
                      className="relative z-20 px-3 py-1.5 text-sm font-bmjua rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 touch-manipulation"
                      title="삭제"
                    >
                      {deletingCostId === cost.costId ? '삭제 중...' : '삭제'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 총 금액 및 정산하기 버튼 */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
              <div className="bg-blue-50 px-4 py-3 rounded-lg text-center sm:text-left">
                <span className="text-text-600 text-sm">총 결제 금액: </span>
                <span className="font-bold text-blue-600 text-lg">
                  {formatAmount(calculatedTotalAmount)}원
                </span>
              </div>

              {/* 수락 인원 표시 */}
              {settleInfo && (
                <div className="flex items-center justify-center sm:justify-start gap-2 bg-gray-50 px-4 py-3 rounded-lg relative">
                  <span className="text-text-600 text-sm whitespace-nowrap">
                    수락: {settleInfo.acceptedCount}/{settleInfo.totalMemberCount}
                  </span>
                  <div
                    className="relative"
                    onMouseEnter={() => setShowSettleTooltip(true)}
                    onMouseLeave={() => setShowSettleTooltip(false)}
                  >
                    <svg
                      className="w-4 h-4 text-gray-400 cursor-help"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {showSettleTooltip && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-bold text-text-500 mb-2">수락한 인원</p>
                            <div className="space-y-1">
                              {settleInfo.acceptedMembers.length > 0 ? (
                                settleInfo.acceptedMembers.map((member) => (
                                  <div
                                    key={member.memberId}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    {member.thumbnailUrl ? (
                                      <img
                                        src={member.thumbnailUrl}
                                        alt={member.memberName}
                                        className="w-5 h-5 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          {member.memberName.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-text-600">{member.memberName}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-gray-400">수락한 인원이 없습니다.</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-text-500 mb-2">미수락 인원</p>
                            <div className="space-y-1">
                              {settleInfo.notAcceptedMembers.length > 0 ? (
                                settleInfo.notAcceptedMembers.map((member) => (
                                  <div
                                    key={member.memberId}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    {member.thumbnailUrl ? (
                                      <img
                                        src={member.thumbnailUrl}
                                        alt={member.memberName}
                                        className="w-5 h-5 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          {member.memberName.charAt(0)}
                                        </span>
                                      </div>
                                    )}
                                    <span className="text-text-600">{member.memberName}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-green-600">모든 인원이 수락했습니다!</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 모든 인원이 수락했으면 정산 결과 확인하기 버튼, 아니면 정산 수락하기 버튼 */}
              {settleInfo &&
              settleInfo.acceptedCount === settleInfo.totalMemberCount &&
              settleInfo.totalMemberCount > 0 ? (
                <div className="bg-blue-50 px-4 py-3 rounded-lg text-center sm:text-left">
                  <span className="text-text-600 text-sm">정산이 완료되었습니다</span>
                </div>
              ) : (
                <SolidButton
                  onClick={handleSettle}
                  disabled={isSettling || costs.length === 0 || isAlreadyAccepted}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isAlreadyAccepted ? '이미 수락함' : isSettling ? '정산 중...' : '정산 수락하기'}
                </SolidButton>
              )}
            </div>
          </div>
        </>
      )}

      {/* CostDetailModal */}
      {isModalOpen && selectedCostId !== null && (
        <CostDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          tripId={tripId}
          costId={selectedCostId}
          onRefresh={async () => {
            await loadCostList()
            await loadSettleInfo()
          }}
        />
      )}

      {/* Toast */}
      <ToastDock
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </div>
  )
}

export default CostList
