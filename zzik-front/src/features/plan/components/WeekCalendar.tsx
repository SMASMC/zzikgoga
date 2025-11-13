import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekCalendarProps {
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onPrevWeek: () => void
  onNextWeek: () => void
}

export default function WeekCalendar({
  selectedDate,
  onDateSelect,
  onPrevWeek,
  onNextWeek,
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

  // 주의 시작일과 종료일 가져오기
  const getWeekRange = () => {
    const firstDay = weekDays[0]
    const lastDay = weekDays[weekDays.length - 1]
    return `${firstDay.getMonth() + 1}월 ${firstDay.getDate()}일 - ${lastDay.getMonth() + 1}월 ${lastDay.getDate()}일`
  }

  return (
    <div className="space-y-4">
      {/* 달력 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevWeek}
          className="rounded-[8px] w-[36px] h-[32px] flex items-center justify-center hover:bg-slate-100"
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
          className="rounded-[8px] w-[36px] h-[32px] flex items-center justify-center hover:bg-slate-100"
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

            return (
              <button
                key={index}
                onClick={() => onDateSelect(day)}
                className={`
                  flex flex-col items-center justify-center w-[70px] py-2 rounded-full transition-all
                  ${
                    isSelected
                      ? 'bg-white text-point-500 border border-point-600 shadow-lg'
                      : isToday
                        ? 'bg-blue-50 text-neutral-950'
                        : 'bg-white text-neutral-950 hover:bg-slate-50'
                  }
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
