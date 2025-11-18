import { useState, useRef } from 'react'
import CostAdd, { CostAddRef } from '@/features/cost/components/CostAdd'
import CostList from '@/features/cost/components/CostList'
import { useParams } from 'react-router-dom'

const CostPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const costAddRef = useRef<CostAddRef>(null)

  if (!tripId) {
    return (
      <div>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-text-500">여행 ID가 없습니다.</p>
        </div>
      </div>
    )
  }

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleSettleAccepted = () => {
    // CostAdd의 정산 정보를 즉시 업데이트
    costAddRef.current?.refreshSettleInfo()
  }

  return (
    <div>
      <main className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 mt-6 sm:mt-8 md:mt-10 pb-10">
        {/* 1:2 비율 레이아웃 (CostAdd : CostList) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CostAdd - 1/3 너비 */}
          <div className="lg:col-span-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <CostAdd onCostAdded={handleRefresh} ref={costAddRef as any} />
          </div>

          {/* CostList - 2/3 너비 */}
          <div className="lg:col-span-2">
            <CostList
              tripId={tripId}
              onRefresh={refreshTrigger}
              onSettleAccepted={handleSettleAccepted}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default CostPage
