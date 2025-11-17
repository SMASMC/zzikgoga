import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import BudgetPanel from '@features/plan/components/BudgetPanel'
import PlaceBoard from '@features/plan/components/PlaceBoard'
import PlaceSearchPanel from '@features/plan/components/PlaceSearchPanel'
import PlanCollaborationLayer from '@features/plan/components/PlanCollaborationLayer'
import { useSharedCursors } from '@features/plan/hooks/useSharedCursors'
import Header from '@/components/blocks/Header'

const getRoomId = (tripId: string | undefined) =>
  tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'

const PlanPage = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(() => getRoomId(tripId), [tripId])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // plan 페이지 접속 시 게스트 ID 초기화하여 새로운 커서 색상 할당
  useEffect(() => {
    localStorage.removeItem('plan-cursor-guest-identity')
  }, [])

  const cursorSession = useSharedCursors(roomId)

  return (
    <div className="flex flex-col h-screen">
      <PlanCollaborationLayer cursorSession={cursorSession}>
        <Header showBackButton whiteBackground />
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-y-hidden relative">
          <PlaceSearchPanel isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
          <PlaceBoard
            cursorSession={cursorSession}
            onOpenPlaceDrawer={() => setIsDrawerOpen(true)}
          />
          <BudgetPanel />
        </div>
      </PlanCollaborationLayer>
    </div>
  )
}

export default PlanPage
