import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import BudgetPanel from '@features/plan/components/BudgetPanel'
import PlaceBoard from '@features/plan/components/PlaceBoard'
import PlaceSearchPanel from '@features/plan/components/PlaceSearchPanel'
import PlanCollaborationLayer from '@features/plan/components/PlanCollaborationLayer'
import { useSharedCursors } from '@features/plan/hooks/useSharedCursors'

const getRoomId = (tripId: string | undefined) =>
  tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'

const PlanPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(() => getRoomId(tripId), [tripId])

  const cursorSession = useSharedCursors(roomId)

  return (
    <PlanCollaborationLayer cursorSession={cursorSession}>
      <PlaceSearchPanel />
      <PlaceBoard cursorSession={cursorSession} />
      <BudgetPanel />
    </PlanCollaborationLayer>
  )
}

export default PlanPage
