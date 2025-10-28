import BudgetPanel from '@features/plan/components/BudgetPanel'
import PlaceBoard from '@features/plan/components/PlaceBoard'
import PlaceSearchPanel from '@features/plan/components/PlaceSearchPanel'

const PlanPage = () => {
  return (
    <div
      className="
        flex flex-col md:flex-row 
        h-auto md:h-screen
        "
    >
      <PlaceSearchPanel />
      <PlaceBoard />
      <BudgetPanel />
    </div>
  )
}

export default PlanPage
