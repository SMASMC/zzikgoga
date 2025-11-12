import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import SolidButton from '@/components/atoms/SolidButton'
import Input from '@/components/atoms/Input'
import { ToastDock } from '@/components/blocks/ToastDock'
import { DropdownSelect } from '@/components/blocks/DropdownSelect'
import Calendar from '@/components/atoms/Calendar'
import { useYTripDoc } from '../hooks/useYTripDoc'
import YTextEditor from './YTextEditor'
import * as Y from 'yjs'
import type { CostCategory } from '@/features/cost/types/cost'
import { COST_CATEGORIES, COST_CATEGORY_LABELS } from '@/features/cost/types/cost'

const todayKey = () => new Date().toISOString().slice(0, 10)

const CATEGORY_OPTIONS = COST_CATEGORIES.map((cat) => ({
  label: COST_CATEGORY_LABELS[cat],
  value: cat,
}))

const BudgetPanel = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(
    () => (tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'),
    [tripId]
  )

  const { budgetsByDate, addBudget, doc, tripInfo, removeBudget } = useYTripDoc(roomId)

  const [date, setDate] = useState<string>(todayKey())
  const [category, setCategory] = useState<CostCategory>('ETC')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const calendarRef = useRef<HTMLDivElement | null>(null)

  const isWithinTripRange = useCallback(
    (targetDate: string) => {
      if (!tripInfo.start_date || !tripInfo.end_date) {
        return true
      }
      return tripInfo.start_date <= targetDate && targetDate <= tripInfo.end_date
    },
    [tripInfo.end_date, tripInfo.start_date]
  )

  const buildRangeMessage = useCallback(() => {
    if (tripInfo.start_date && tripInfo.end_date) {
      return `여행 기간은 ${tripInfo.start_date} ~ ${tripInfo.end_date} 입니다.`
    }
    return '여행 일정 날짜를 확인해주세요.'
  }, [tripInfo.end_date, tripInfo.start_date])

  const notifyOutOfRange = useCallback(() => {
    setToastMessage(buildRangeMessage())
  }, [buildRangeMessage])

  const handleAdd = () => {
    const amt = Number(amount)
    if (!date || !category || !Number.isFinite(amt)) {
      return
    }
    if (!isWithinTripRange(date)) {
      notifyOutOfRange()
      return
    }
    addBudget(date, { category, amount: amt, description: description.trim() })
    setAmount('')
    setDescription('')
  }

  const handleCalendarSelect = (selectedStart: Date) => {
    const nextDate = selectedStart.toISOString().slice(0, 10)
    setDate(nextDate)
    setShowCalendar(false)
    if (!isWithinTripRange(nextDate)) {
      notifyOutOfRange()
    }
  }

  useEffect(() => {
    if (!showCalendar) return
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCalendar])

  const dateLabel = (() => {
    if (!date) return '날짜 선택'
    try {
      return new Date(date).toLocaleDateString('ko-KR')
    } catch {
      return date
    }
  })()

  return (
    <aside className="flex w-full min-h-0 flex-col gap-4 border-l border-slate-200 bg-white p-4 md:w-1/4">
      <ToastDock
        open={Boolean(toastMessage)}
        variant="warning"
        title="날짜 범위를 확인해주세요"
        message={toastMessage ?? ''}
        autoCloseMs={3000}
        offsetPx={16}
        onClose={() => setToastMessage(null)}
      />
      <header>
        <h2 className="text-4xl font-bold text-slate-800">예산</h2>
        <p className="mt-1 text-sm text-slate-400">예산을 입력할 수 있습니다.</p>
      </header>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2" ref={calendarRef}>
            <button
              type="button"
              onClick={() => setShowCalendar((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:border-point-400 hover:bg-background-500"
            >
              <span>{dateLabel}</span>
              <svg
                className={`h-4 w-4 transition-transform ${showCalendar ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCalendar ? (
              <div className="relative mt-2">
                <div className="absolute z-20">
                  <Calendar
                    mode="single"
                    initialStartDate={date ? new Date(date) : undefined}
                    initialEndDate={date ? new Date(date) : undefined}
                    onDateSelect={(start) => handleCalendarSelect(start)}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <DropdownSelect
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(value) => setCategory(value as CostCategory)}
            placeholder="카테고리"
            className="w-full "
          />
          <Input
            type="number"
            placeholder="금액"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Input
            type="text"
            placeholder="설명"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <SolidButton
          onClick={handleAdd}
          className="bg-emerald-500 text-white hover:bg-emerald-600 rounded-full"
        >
          추가하기
        </SolidButton>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
        {Object.keys(budgetsByDate).length === 0 ? (
          <p className="text-center text-sm text-slate-400">설명을 입력하십시오.</p>
        ) : (
          Object.entries(budgetsByDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([d, items]) => (
              <div key={d} className="rounded-md border border-slate-100 p-2">
                <div className="mb-1 text-xs font-semibold text-slate-500">{d}</div>
                {items.length === 0 ? (
                  <div className="text-xs text-slate-400">설명</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {items.map((it, idx) => {
                      let yDesc: Y.Text | null = null
                      if (doc) {
                        const yMap = doc.getMap('budgets') as Y.Map<unknown>
                        const yArr = yMap.get(d) as Y.Array<Y.Map<unknown>> | undefined
                        const yItem = yArr?.get(idx) as Y.Map<unknown> | undefined
                        const desc = yItem?.get('description')
                        if (desc instanceof Y.Text) yDesc = desc
                      }
                      return (
                        <li
                          key={`${d}-${it.id ?? 'n'}-${idx}`}
                          className="rounded border border-slate-100 bg-white p-2"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-700">
                              {COST_CATEGORY_LABELS[it.category as CostCategory] || it.category}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600">{it.amount.toLocaleString()}원</span>
                              <button
                                type="button"
                                onClick={() => removeBudget(d, it.id ?? it.uid!)}
                                className="rounded-full border border-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-500 transition hover:border-red-300 hover:bg-red-50"
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                          {yDesc ? (
                            <div className="mt-1">
                              <YTextEditor ytext={yDesc} />
                            </div>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ))
        )}
      </div>
    </aside>
  )
}
export default BudgetPanel
