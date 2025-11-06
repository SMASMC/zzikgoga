import NewHeader from '@/components/blocks/NewHeader'
import CostAdd from '@/features/cost/components/CostAdd'
import CostList from '@/features/cost/components/CostList'

const CostPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <NewHeader />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-500 mb-8 font-bmjua">여행 정산</h1>

        {/* 1:2 비율 레이아웃 (CostAdd : CostList) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CostAdd - 1/3 너비 */}
          <div className="lg:col-span-1">
            <CostAdd />
          </div>

          {/* CostList - 2/3 너비 */}
          <div className="lg:col-span-2">
            <CostList />
          </div>
        </div>
      </main>
    </div>
  )
}

export default CostPage
