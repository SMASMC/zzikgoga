// Calendar.tsx
// 날짜 선택 캘린더 컴포넌트

import { useState, useEffect } from 'react'

interface CalendarProps {
  onDateSelect?: (startDate: Date, endDate: Date) => void
  initialStartDate?: Date
  initialEndDate?: Date
}

const Calendar = ({ onDateSelect, initialStartDate, initialEndDate }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [startDate, setStartDate] = useState<Date | null>(initialStartDate || null)
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate || null)
  const [isSelectingEnd, setIsSelectingEnd] = useState(false)

  // initialStartDate와 initialEndDate가 변경될 때 상태 업데이트
  useEffect(() => {
    if (initialStartDate) setStartDate(initialStartDate)
    if (initialEndDate) setEndDate(initialEndDate)
  }, [initialStartDate, initialEndDate])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // 해당 월의 첫날과 마지막날
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // 달력에 표시할 날짜들 생성
  const getDaysInMonth = () => {
    const days = []
    const firstDayOfWeek = firstDay.getDay() // 0(일) ~ 6(토)

    // 이전 달의 날짜들 (빈 칸)
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    // 현재 달의 날짜들
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const days = getDaysInMonth()

  // 날짜가 비활성화되어야 하는지 확인
  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // 오늘 날짜의 시작 시간으로 설정

    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)

    // 오늘 이전 날짜는 비활성화
    if (dateToCheck < today) return true

    // 시작 날짜를 선택한 후 (끝 날짜 선택 중) 시작 날짜 이전 날짜는 비활성화
    if (isSelectingEnd && startDate) {
      const startDateNormalized = new Date(startDate)
      startDateNormalized.setHours(0, 0, 0, 0)
      if (dateToCheck < startDateNormalized) return true
    }

    return false
  }

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date) => {
    // 비활성화된 날짜는 클릭 불가
    if (isDateDisabled(date)) return

    if (!isSelectingEnd) {
      // 첫 번째 클릭: 시작 날짜 설정
      setStartDate(date)
      setEndDate(date) // 일단 같은 날짜로 설정
      setIsSelectingEnd(true)
    } else {
      // 두 번째 클릭: 끝 날짜 설정
      setEndDate(date)
      setIsSelectingEnd(false)

      // 콜백 호출
      if (onDateSelect) {
        onDateSelect(startDate!, date)
      }
    }
  }

  // 이전 달로 이동
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1))
  }

  // 다음 달로 이동
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1))
  }

  // 날짜가 선택된 범위 내에 있는지 확인
  const isInRange = (date: Date) => {
    if (!startDate || !endDate) return false
    return date >= startDate && date <= endDate
  }

  // 날짜가 시작일인지 확인
  const isStartDate = (date: Date) => {
    if (!startDate) return false
    return date.toDateString() === startDate.toDateString()
  }

  // 날짜가 종료일인지 확인
  const isEndDate = (date: Date) => {
    if (!endDate) return false
    return date.toDateString() === endDate.toDateString()
  }

  // 오늘 날짜인지 확인
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-4 sm:p-6 font-bmjua">
      {/* 헤더: 월/년 선택 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-background-500 rounded-full transition-colors"
          aria-label="이전 달"
        >
          <svg
            className="w-5 h-5 text-text-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 className="text-lg sm:text-xl font-bold text-text-500">
          {year}년 {month + 1}월
        </h2>

        <button
          onClick={nextMonth}
          className="p-2 hover:bg-background-500 rounded-full transition-colors"
          aria-label="다음 달"
        >
          <svg
            className="w-5 h-5 text-text-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs sm:text-sm font-semibold py-2 ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-text-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const inRange = isInRange(date)
          const isStart = isStartDate(date)
          const isEnd = isEndDate(date)
          const today = isToday(date)
          const disabled = isDateDisabled(date)

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm sm:text-base
                transition-all
                ${disabled ? 'text-gray-300' : 'hover:scale-105'}
                ${!disabled && inRange ? 'bg-background-500' : ''}
                ${!disabled && (isStart || isEnd) ? 'bg-gradient-to-br from-point-500 to-main-700 text-white font-bold shadow-md' : ''}
                ${!disabled && !inRange && !isStart && !isEnd ? 'hover:bg-background-500' : ''}
                ${!disabled && today && !isStart && !isEnd ? 'border-2 border-point-500' : ''}
                ${!disabled && date.getDay() === 0 && !isStart && !isEnd ? 'text-red-500' : ''}
                ${!disabled && date.getDay() === 6 && !isStart && !isEnd ? 'text-blue-500' : ''}
                ${!disabled && !isStart && !isEnd && date.getDay() !== 0 && date.getDay() !== 6 ? 'text-text-500' : ''}
              `}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* 선택된 날짜 표시 */}
      {startDate && (
        <div className="mt-4 pt-4 border-t border-background-600">
          <div className="text-center text-sm text-text-600">
            {startDate.toLocaleDateString('ko-KR')}
            {endDate && startDate.toDateString() !== endDate.toDateString() && (
              <> ~ {endDate.toLocaleDateString('ko-KR')}</>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Calendar
