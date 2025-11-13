import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  minDate?: Date
  maxDate?: Date
}

export default function WeekCalendar({
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
  minDate,
  maxDate,
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
    <div className="space-y-4">
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
          <div className="bg-point-500 rounded-full h-[32px] px-[20px] flex items-center justify-center">
            <p className="text-white text-[16px]">{selectedDate.getMonth() + 1}월</p>
          </div>
          <p className="text-[14px] text-[#717182]">{getWeekRange()}</p>
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
                  className={`text-[12px] mb-2 ${isSelected ? 'text-point-500' : 'text-[#717182]'}`}
                >
                  {getDayName(day)}
                </p>
                <p className={`text-[18px] ${isSelected ? 'text-point-500' : 'text-neutral-950'}`}>
                  {day.getDate()}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

