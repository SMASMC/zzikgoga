import BudgetPanel from '@features/plan/components/BudgetPanel'
import PlaceBoard from '@features/plan/components/PlaceBoard'
import PlaceSearchPanel from '@features/plan/components/PlaceSearchPanel'

const PlanPage = () => {
  return (
    <div className="flex min-h-0 flex-col md:h-screen md:min-h-0 md:flex-row">
      <PlaceSearchPanel />
      <PlaceBoard />
      <BudgetPanel />
    </div>
  )
}

export default PlanPage
