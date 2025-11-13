// CostList.tsx
// 정산 리스트 컴포넌트
// 전체 정산 내역 및 상세 조회
import { useState, useEffect } from 'react'
import { CostListService, CostDetailService } from '../services/costService'
import { CostListResponse } from '../types/cost'
import CostDetailModal from './CostDetailModal'

interface CostListProps {
  tripId: string
  onRefresh?: number
}

const CostList = ({ tripId, onRefresh }: CostListProps) => {
  const [costs, setCosts] = useState<CostListResponse[]>([])
  const [totalCostCount, setTotalCostCount] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCostId, setSelectedCostId] = useState<number | null>(null)
  const [deletingCostId, setDeletingCostId] = useState<number | null>(null)

  const loadCostList = async () => {
    setIsLoading(true)
    try {
      const response = await CostListService.getCostList(tripId)
      setCosts(response.costs)
      setTotalCostCount(response.totalCostCount)
      setTotalCost(response.totalCost)
    } catch (error) {
      console.error('비용 목록 불러오기 실패:', error)
      setCosts([])
      setTotalCostCount(0)
      setTotalCost(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (tripId) {
      loadCostList()
    }
  }, [tripId])

  // onRefresh prop이 변경되면 목록 새로고침
  useEffect(() => {
    if (onRefresh !== undefined && tripId) {
      loadCostList()
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
      alert('결제 내역 삭제에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setDeletingCostId(null)
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 h-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-500 mb-4 font-bmjua">정산 내역</h2>
        <div className="flex gap-4 text-sm">
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-text-600">총 건수: </span>
            <span className="font-bold text-blue-600">{totalCostCount}건</span>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-text-600">총 금액: </span>
            <span className="font-bold text-blue-600">{formatAmount(totalCost)}원</span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : costs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">정산 내역이 없습니다.</div>
      ) : (
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar">
          {costs.map((cost) => (
            <div
              key={cost.costId}
              onClick={() => handleCostClick(cost.costId)}
              className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
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
                    onClick={(e) => handleDelete(e, cost.costId)}
                    disabled={deletingCostId === cost.costId}
                    className="px-3 py-1.5 text-sm font-bmjua rounded-lg bg-red-500 text-white hover:bg-red-600 shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    title="삭제"
                  >
                    {deletingCostId === cost.costId ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CostDetailModal */}
      {isModalOpen && selectedCostId !== null && (
        <CostDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          tripId={tripId}
          costId={selectedCostId}
          onRefresh={loadCostList}
        />
      )}
    </div>
  )
}

export default CostList
