import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CostSettleService } from '@/features/cost/services/costService'
import { SettleFinalResponse } from '@/features/cost/types/settle'
import GradientBackground from '@/components/blocks/GradientBackground'

const CostFinalPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const [settleFinal, setSettleFinal] = useState<SettleFinalResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (tripId) {
      const loadSettleFinal = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await CostSettleService.getSettleFinal(Number(tripId))
          console.log('정산 결과 응답:', response)
          console.log('combinedSettlement:', response.combinedSettlement)
          setSettleFinal(response)
        } catch (err) {
          console.error('정산 결과 조회 실패:', err)
          setError('정산 결과를 불러오는데 실패했습니다.')
        } finally {
          setIsLoading(false)
        }
      }
      loadSettleFinal()
    }
  }, [tripId])

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('ko-KR')
  }

  return (
    <GradientBackground>
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        <h1 className="text-3xl font-bold text-text-500 mb-8 font-bmjua">정산 결과</h1>

        <div className="bg-white rounded-3xl shadow-lg p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : settleFinal ? (
            settleFinal.combinedSettlement && settleFinal.combinedSettlement.length > 0 ? (
            <div className="space-y-6">
              {settleFinal.combinedSettlement.map((settlement) => (
                <div
                  key={settlement.memberId}
                  className="bg-gray-50 rounded-xl p-6 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-text-500 font-bmjua">
                      {settlement.memberName}
                    </h3>
                    <div className="text-right">
                      <p className="text-sm text-text-600">최종 정산 금액</p>
                      <p
                        className={`text-2xl font-bold ${
                          settlement.netAmount > 0
                            ? 'text-blue-600'
                            : settlement.netAmount < 0
                              ? 'text-red-600'
                              : 'text-gray-600'
                        }`}
                      >
                        {settlement.netAmount > 0 ? '+' : ''}
                        {formatAmount(settlement.netAmount)}원
                      </p>
                    </div>
                  </div>

                  {settlement.toReceive.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-text-500 mb-2">받을 돈</p>
                      <div className="space-y-2">
                        {settlement.toReceive.map((receive, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-green-50 rounded-lg p-3"
                          >
                            <span className="text-text-600">{receive.fromMemberName}에게</span>
                            <span className="font-bold text-green-600">
                              +{formatAmount(receive.amount)}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {settlement.toSend.length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-text-500 mb-2">보낼 돈</p>
                      <div className="space-y-2">
                        {settlement.toSend.map((send, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-red-50 rounded-lg p-3"
                          >
                            <span className="text-text-600">{send.targetMemberName}에게</span>
                            <span className="font-bold text-red-600">
                              -{formatAmount(send.amount)}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                정산 결과가 없습니다.
                <div className="mt-4 text-xs text-gray-400">
                  응답: {JSON.stringify(settleFinal, null, 2)}
                </div>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-gray-500">정산 결과를 불러오는 중...</div>
          )}
        </div>
      </main>
    </GradientBackground>
  )
}

export default CostFinalPage