// CostList.tsx
// 정산 리스트 컴포넌트
// 전체 정산 내역 및 상세 조회
import { useState, useEffect } from 'react'
import { CostListService } from '../services/costService'
import { CostListResponse } from '../types/cost'

interface CostListProps {
  tripId: string
}

const CostList = ({ tripId }: CostListProps) => {
  const [costs, setCosts] = useState<CostListResponse[]>([])
  const [totalCostCount, setTotalCostCount] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
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

    if (tripId) {
      loadCostList()
    }
  }, [tripId])

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

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 h-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-500 mb-4 font-bmjua">정산 내역</h2>
        <div className="flex gap-4 text-sm">
          <div className="bg-blue-50 px-4 py-2 rounded-lg">
            <span className="text-text-600">총 건수: </span>
            <span className="font-bold text-blue-600">{totalCostCount}건</span>
          </div>
          <div className="bg-green-50 px-4 py-2 rounded-lg">
            <span className="text-text-600">총 금액: </span>
            <span className="font-bold text-green-600">{formatAmount(totalCost)}원</span>
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
              className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
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
                    </div>
                    <p className="text-sm text-text-600 truncate">{cost.place}</p>
                    <p className="text-xs text-gray-500">{formatDate(cost.paidAt)}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <p className="text-lg font-bold text-blue-600">{formatAmount(cost.totalAmount)}원</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CostList
