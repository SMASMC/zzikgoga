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
          setSettleFinal(response)
        } catch (err) {
          setError('정산 결과를 불러오는데 실패했습니다.')
        } finally {
          setIsLoading(false)
        }
      }
      loadSettleFinal()
    }
  }, [tripId])

  const formatAmount = (amount: number) => amount.toLocaleString('ko-KR')

  if (isLoading) return <div className="text-center mt-20">로딩 중...</div>
  if (error) return <div className="text-center mt-20 text-red-500">{error}</div>
  if (!settleFinal) return null

  const settlements = Array.isArray(settleFinal.combinedSettlement)
    ? settleFinal.combinedSettlement
    : [settleFinal.combinedSettlement]

  return (
    <GradientBackground>
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-20 mt-10 pb-20">
        <h1 className="text-3xl font-bold text-text-500 mb-10 font-bmjua">정산 결과</h1>

        {settlements.map((s) => {
          const totalReceive = s.toReceive.reduce((acc, cur) => acc + cur.amount, 0)
          const totalSend = s.toSend.reduce((acc, cur) => acc + cur.amount, 0)
          const net = s.netAmount

          return (
            <div
              key={s.memberId}
              className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-3xl p-10 mb-16 border border-gray-200/50"
            >
              <h2 className="text-2xl font-bold text-text-500 mb-10 font-bmjua">
                {s.memberName}님의 돈 흐름 다이어그램
              </h2>

              {/* 다이어그램 전체 */}
              <div className="flex justify-between items-center gap-10 relative">

                {/* 왼쪽 : 나에게 돈을 줄 사람들 */}
                <div className="flex-1 border-2 border-green-400/60 rounded-2xl p-6 bg-gradient-to-br from-green-50 to-green-100/50 shadow-lg">
                  <p className="text-green-700 font-bold text-lg mb-4">나에게 돈을 줄 사람들</p>

                  {s.toReceive.length > 0 ? (
                    s.toReceive.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white border-2 border-green-300/50 rounded-xl py-3 px-4 mb-3 shadow-md"
                      >
                        <div className="flex items-center space-x-3 text-green-700 font-semibold">
                          <span className="rounded-full bg-gradient-to-br from-green-400 to-green-600 h-9 w-9 flex items-center justify-center text-white shadow-md">
                            {item.fromMemberName.slice(0, 1)}
                          </span>
                          <span className="text-text-600">{item.fromMemberName}</span>
                        </div>

                        <span className="text-green-600 font-bold">
                          +{formatAmount(item.amount)}원
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-text-400">받을 돈이 없습니다.</p>
                  )}

                  <p className="text-green-700 font-bold mt-3">
                    총 수입: +{formatAmount(totalReceive)}원
                  </p>
                </div>

                {/* 중앙 원형 - 나 */}
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="rounded-full h-32 w-32 bg-gradient-to-br from-blue-400 to-blue-600 border-4 border-blue-500 shadow-2xl flex flex-col items-center justify-center text-white font-bold text-xl relative">
                    <span className="mb-1">나</span>
                    <span className="text-sm text-blue-100 mt-1">
                      {formatAmount(net)}원
                    </span>
                  </div>
                  
                  {/* 왼쪽 → 중앙 화살표 */}
                  { s.toReceive.length > 0 && (
                    <div className="absolute left-[-64px] top-1/2 -translate-y-1/2 flex items-center w-20">

                      {/* 선 부분 */}
                      <div className="h-2 w-full bg-gradient-to-r from-green-500 to-green-400"></div>

                      {/* 삼각형 촉 부분 */}
                      <div
                        className="
                          w-0 h-0
                          border-l-[20px] border-l-green-500
                          border-t-[8px] border-t-transparent
                          border-b-[8px] border-b-transparent
                        "
                      ></div>
                    </div>
                  )}

                  
                  {/* 오른쪽으로 가는 화살표 (줄 돈이 있을 때) */}
                  {/* 중앙 → 오른쪽 화살표 */}
                  { s.toSend.length > 0 && (
                    <div className="absolute right-[-64px] top-1/2 -translate-y-1/2 flex items-center w-20">

                      {/* 선 부분 */}
                      <div className="h-2 w-full bg-gradient-to-r from-red-400 to-red-500"></div>
                      {/* 삼각형 촉 부분 */}
                      <div
                        className="
                          w-0 h-0
                          border-l-[20px] border-l-red-500
                          border-t-[8px] border-t-transparent
                          border-b-[8px] border-b-transparent
                        "
                      ></div>

                    </div>
                  )}

                </div>

                {/*  오른쪽 : 내가 돈을 줄 사람들 */}
                <div className="flex-1 border-2 border-red-400/60 rounded-2xl p-6 bg-gradient-to-br from-red-50 to-red-100/50 shadow-lg">
                  <p className="text-red-700 font-bold text-lg mb-4">내가 돈을 줄 사람들</p>

                  {s.toSend.length > 0 ? (
                    s.toSend.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-white border-2 border-red-300/50 rounded-xl py-3 px-4 mb-3 shadow-md"
                      >
                        <div className="flex items-center space-x-3 text-red-700 font-semibold">
                          <span className="rounded-full bg-gradient-to-br from-red-400 to-red-600 h-9 w-9 flex items-center justify-center text-white shadow-md">
                            {item.targetMemberName.slice(0, 1)}
                          </span>
                          <span className="text-text-600">{item.targetMemberName}</span>
                        </div>

                        <span className="text-red-600 font-bold">
                          -{formatAmount(item.amount)}원
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-text-400">보낼 돈이 없습니다.</p>
                  )}

                  <p className="text-red-700 font-bold mt-3">
                    총 지출: -{formatAmount(totalSend)}원
                  </p>
                </div>
              </div>

              {/* 요약 섹션 */}
              <div className="mt-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 grid grid-cols-3 gap-4 shadow-inner">
                <div className="text-center bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-400/60 rounded-xl p-4 shadow-md">
                  <p className="text-green-700 font-bold mb-2">총 수입</p>
                  <p className="text-xl font-bold text-green-600">
                    +{formatAmount(totalReceive)}원
                  </p>
                </div>

                <div className="text-center bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-400/60 rounded-xl p-4 shadow-md">
                  <p className="text-red-700 font-bold mb-2">총 지출</p>
                  <p className="text-xl font-bold text-red-600">
                    -{formatAmount(totalSend)}원
                  </p>
                </div>

                <div className="text-center bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400/60 rounded-xl p-4 shadow-md">
                  <p className="text-blue-700 font-bold mb-2">순 금액</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatAmount(net)}원
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </main>
    </GradientBackground>
  )
}

export default CostFinalPage
