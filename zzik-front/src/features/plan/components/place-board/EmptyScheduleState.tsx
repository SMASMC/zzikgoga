/**
 * EmptyScheduleState Component
 *
 * Displays a welcome message when there are no schedules in the trip.
 * Pure presentational component with no props.
 */

const EmptyScheduleState = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex flex-col gap-3">
        <span className="text-2xl font-bold text-slate-800">
          여행 일정 보드에 팀원과 함께 참여하세요
        </span>
        <span className="text-lg text-slate-600">
          마우스를 움직이면 서로의 커서를, 메시지를 보내면 실시간으로 공유돼요
        </span>
      </div>
    </div>
  )
}

export default EmptyScheduleState
