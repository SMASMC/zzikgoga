import { ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react'
import { MdDirectionsCar } from 'react-icons/md'

interface WeekCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  minDate?: Date
  maxDate?: Date
  onOpenPlaceDrawer?: () => void
  onAddSchedule?: () => void
  onCalculateTravelTime?: () => void
  isCalculating?: boolean
  showCalculateTravelTime?: boolean
}

export default function WeekCalendar({
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
  minDate,
  maxDate,
  onOpenPlaceDrawer,
  onAddSchedule,
  onCalculateTravelTime,
  isCalculating = false,
  showCalculateTravelTime = false,
}: WeekCalendarProps) {
  // 선택한 날짜 기준으로 일주일 생성 (선택한 날짜를 중심으로)
  const getWeekDays = () => {
    const days = []
    for (let i = -3; i <= 3; i++) {
      const date = new Date(selectedDate)
      date.setDate(selectedDate.getDate() + i)
      days.push(date)
    }
    return days
  }

  const weekDays = getWeekDays()

  const getDayName = (date: Date) => {
    const days = ['일', '월', '화', '수', '목', '금', '토']
    return days[date.getDay()]
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  const inRange = (d: Date) => {
    const t = d.setHours(0, 0, 0, 0)
    const min = minDate ? new Date(minDate).setHours(0, 0, 0, 0) : undefined
    const max = maxDate ? new Date(maxDate).setHours(0, 0, 0, 0) : undefined
    if (min !== undefined && t < min) return false
    if (max !== undefined && t > max) return false
    return true
  }

  // 주의 시작일과 종료일 가져오기
  const getWeekRange = () => {
    const firstDay = weekDays[0]
    const lastDay = weekDays[weekDays.length - 1]
    return `${firstDay.getMonth() + 1}월 ${firstDay.getDate()}일 - ${lastDay.getMonth() + 1}월 ${lastDay.getDate()}일`
  }

  const canPrev = (() => {
    if (!minDate) return true
    const prevAnchor = new Date(selectedDate)
    prevAnchor.setDate(prevAnchor.getDate() - 7)
    // 이전 주의 마지막 날이 최소일보다 크거나 같다면 가능
    const lastOfPrevWeek = new Date(selectedDate)
    lastOfPrevWeek.setDate(selectedDate.getDate() - 1)
    return inRange(lastOfPrevWeek)
  })()

  const canNext = (() => {
    if (!maxDate) return true
    const nextAnchor = new Date(selectedDate)
    nextAnchor.setDate(nextAnchor.getDate() + 7)
    // 다음 주의 첫 날이 최대일보다 작거나 같다면 가능
    const firstOfNextWeek = new Date(selectedDate)
    firstOfNextWeek.setDate(selectedDate.getDate() + 1)
    return inRange(firstOfNextWeek)
  })()

  return (
    <div className="flex gap-6 items-start">
      {/* 왼쪽: 달력 영역 */}
      <div className="flex-1 space-y-4">
        {/* 달력 네비게이션 */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevWeek}
            disabled={!canPrev}
            className={`rounded-[8px] w-[36px] h-[32px] flex items-center justify-center hover:bg-slate-100 ${
              !canPrev ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-point-500 rounded-full h-[48px] px-[28px] flex items-center justify-center">
              <p className="text-white text-xl font-semibold">{selectedDate.getMonth() + 1}월</p>
            </div>
            <p className="text-lg text-[#717182]">{getWeekRange()}</p>
          </div>

          <button
            onClick={onNextWeek}
            disabled={!canNext}
            className={`rounded-[8px] w-[36px] h-[32px] flex items-center justify-center hover:bg-slate-100 ${
              !canNext ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 일주일 달력 */}
        <div className="flex justify-center">
          <div className="flex gap-3">
            {weekDays.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())
              const enabled = inRange(day)

              return (
                <button
                  key={index}
                  onClick={() => enabled && onDateSelect(day)}
                  className={`
                    flex flex-col items-center justify-center w-[70px] py-2 rounded-full transition-all
                    ${
                      isSelected
                        ? 'bg-white text-point-500 border border-point-600 shadow-lg'
                        : isToday
                          ? 'bg-blue-50 text-neutral-950'
                          : 'bg-white text-neutral-950 hover:bg-slate-50'
                    }
                    ${!enabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''}
                  `}
                >
                  <p
                    className={`text-base mb-2 ${isSelected ? 'text-point-500' : 'text-[#717182]'}`}
                  >
                    {getDayName(day)}
                  </p>
                  <p className={`text-2xl font-semibold ${isSelected ? 'text-point-500' : 'text-neutral-950'}`}>
                    {day.getDate()}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 오른쪽: 버튼 영역 */}
      <div className="flex flex-col gap-3">
        {/* 장소 추가 */}
        {onOpenPlaceDrawer && (
          <button
            type="button"
            onClick={onOpenPlaceDrawer}
            className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-5 py-2.5 text-base font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:border-emerald-400 shadow-sm whitespace-nowrap"
          >
            <MapPin className="w-5 h-5" strokeWidth={2.5} />
            <span>장소 추가</span>
          </button>
        )}

        {/* 새 일정 */}
        {onAddSchedule && (
          <button
            type="button"
            onClick={onAddSchedule}
            className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-400 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>새 일정</span>
          </button>
        )}

        {/* 이동시간 계산 */}
        {showCalculateTravelTime && onCalculateTravelTime && (
          <button
            type="button"
            onClick={onCalculateTravelTime}
            disabled={isCalculating}
            className="flex items-center gap-2 rounded-full border border-blue-300 bg-blue-50 px-5 py-2.5 text-base font-semibold text-blue-700 transition-all hover:bg-blue-100 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
          >
            <MdDirectionsCar className="w-6 h-6" />
            <span>{isCalculating ? '계산 중...' : '이동시간 계산'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
