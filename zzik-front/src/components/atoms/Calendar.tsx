// Calendar.tsx
// 여행 일정/예산 등에서 재사용하는 날짜 선택 캘린더

import { useState, useEffect } from 'react'

type CalendarMode = 'single' | 'range'

interface CalendarProps {
  onDateSelect?: (startDate: Date, endDate: Date) => void
  initialStartDate?: Date
  initialEndDate?: Date
  mode?: CalendarMode
}

const normalizeToNoon = (date?: Date | null) => {
  if (!date) return null
  const next = new Date(date)
  next.setHours(12, 0, 0, 0)
  return next
}

const Calendar = ({
  onDateSelect,
  initialStartDate,
  initialEndDate,
  mode = 'range',
}: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [startDate, setStartDate] = useState<Date | null>(normalizeToNoon(initialStartDate))
  const [endDate, setEndDate] = useState<Date | null>(normalizeToNoon(initialEndDate))
  const [isSelectingEnd, setIsSelectingEnd] = useState(false)

  // 외부에서 전달된 기본 날짜가 바뀌면 동기화
  useEffect(() => {
    if (initialStartDate) setStartDate(normalizeToNoon(initialStartDate))
    if (initialEndDate) setEndDate(normalizeToNoon(initialEndDate))
  }, [initialEndDate, initialStartDate])

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const getDaysInMonth = () => {
    const days: Array<Date | null> = []
    const firstDayOfWeek = firstDay.getDay()

    for (let i = 0; i < firstDayOfWeek; i += 1) {
      days.push(null)
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, month, day)
      date.setHours(12, 0, 0, 0)
      days.push(date)
    }

    return days
  }

  const days = getDaysInMonth()

  const isDateDisabled = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)

    if (dateToCheck < today) return true

    if (mode === 'range' && isSelectingEnd && startDate) {
      const startDateNormalized = new Date(startDate)
      startDateNormalized.setHours(0, 0, 0, 0)
      if (dateToCheck < startDateNormalized) return true
    }

    return false
  }

  const handleDateClick = (date: Date) => {
    if (isDateDisabled(date)) return

    const normalized = normalizeToNoon(date)
    if (!normalized) {
      return
    }

    if (mode === 'single') {
      setStartDate(normalized)
      setEndDate(normalized)
      setIsSelectingEnd(false)
      onDateSelect?.(normalized, normalized)
      return
    }

    if (!isSelectingEnd) {
      setStartDate(normalized)
      setEndDate(normalized)
      setIsSelectingEnd(true)
    } else {
      setEndDate(normalized)
      setIsSelectingEnd(false)
      if (startDate) {
        onDateSelect?.(startDate, normalized)
      }
    }
  }

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1))
  }

  const isInRange = (date: Date) => {
    if (!startDate || !endDate) return false
    return date >= startDate && date <= endDate
  }

  const isStartDate = (date: Date) => {
    if (!startDate) return false
    return date.toDateString() === startDate.toDateString()
  }

  const isEndDate = (date: Date) => {
    if (!endDate) return false
    return date.toDateString() === endDate.toDateString()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const dayLabels = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-4 font-bmjua shadow-lg sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="rounded-full p-2 transition-colors hover:bg-background-500"
          aria-label="이전 달"
        >
          <svg
            className="h-5 w-5 text-text-600"
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

        <h2 className="text-lg font-bold text-text-500 sm:text-xl">
          {year}년 {month + 1}월
        </h2>

        <button
          type="button"
          onClick={nextMonth}
          className="rounded-full p-2 transition-colors hover:bg-background-500"
          aria-label="다음 달"
        >
          <svg
            className="h-5 w-5 text-text-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {dayLabels.map((day, index) => (
          <div
            key={day}
            className={`py-2 text-center text-xs font-semibold sm:text-sm ${
              index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-text-600'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

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
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm transition-all sm:text-base
                ${disabled ? 'text-gray-300' : 'hover:scale-105'}
                ${!disabled && inRange ? 'bg-background-500' : ''}
                ${
                  !disabled && (isStart || isEnd)
                    ? 'bg-gradient-to-br from-hover-600 to-point-600 text-white shadow-md'
                    : ''
                }
                ${
                  !disabled && !inRange && !isStart && !isEnd
                    ? 'hover:bg-background-500 text-text-500'
                    : ''
                }
                ${!disabled && today && !isStart && !isEnd ? 'border-2 border-point-500' : ''}
                ${!disabled && date.getDay() === 0 && !isStart && !isEnd ? 'text-red-500' : ''}
                ${!disabled && date.getDay() === 6 && !isStart && !isEnd ? 'text-blue-500' : ''}
              `}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {startDate && (
        <div className="mt-4 border-t border-background-600 pt-4 text-center text-sm text-text-600">
          {startDate.toLocaleDateString('ko-KR')}
          {endDate && startDate.toDateString() !== endDate.toDateString() && (
            <> ~ {endDate.toLocaleDateString('ko-KR')}</>
          )}
        </div>
      )}
    </div>
  )
}

export default Calendar
