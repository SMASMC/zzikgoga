import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import SolidButton from '@/components/atoms/SolidButton'
import Input from '@/components/atoms/Input'
import { ToastDock } from '@/components/blocks/ToastDock'
import { DropdownSelect } from '@/components/blocks/DropdownSelect'
import { useYTripDoc } from '../hooks/useYTripDoc'
import YTextEditor from './YTextEditor'
import * as Y from 'yjs'
import type { CostCategory } from '@/features/cost/types/cost'
import { COST_CATEGORIES, COST_CATEGORY_LABELS } from '@/features/cost/types/cost'
// Follows selected date broadcasted from PlaceBoard

const toLocalDateKey = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
// no local week navigation in BudgetPanel

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

  // 선택한 날짜 (PlaceBoard에서 공유)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const selectedDateKey = useMemo(() => toLocalDateKey(selectedDate), [selectedDate])
  const metaStorageKey = tripId ? `plan-meta-${tripId}` : null

  const [category, setCategory] = useState<CostCategory>('ETC')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
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
    if (!selectedDateKey || !category || !Number.isFinite(amt)) {
      return
    }
    if (!isWithinTripRange(selectedDateKey)) {
      notifyOutOfRange()
      return
    }
    addBudget(selectedDateKey, { category, amount: amt, description: description.trim() })
    setAmount('')
    setDescription('')
  }

  // 초기 복원 & 이벤트 구독: PlaceBoard가 저장하는 selectedDate를 따라감
  useEffect(() => {
    if (!metaStorageKey || typeof window === 'undefined') return
    try {
      const raw = window.sessionStorage.getItem(metaStorageKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        const stored: string | undefined = parsed?.selectedDate
        if (stored) {
          const d = new Date(stored)
          if (!Number.isNaN(d.getTime())) {
            setSelectedDate(d)
          }
        }
      }
    } catch {
      // ignore
    }
    const listener = (ev: Event) => {
      const ce = ev as CustomEvent<{ tripId: string | null; dateKey: string }>
      const sameTrip = !tripId || ce.detail.tripId === tripId
      if (!ce.detail?.dateKey || !sameTrip) return
      const d = new Date(ce.detail.dateKey)
      if (!Number.isNaN(d.getTime())) setSelectedDate(d)
    }
    window.addEventListener('zzik-plan-selected-date', listener as EventListener)
    return () => {
      window.removeEventListener('zzik-plan-selected-date', listener as EventListener)
    }
  }, [metaStorageKey, tripId])

  // 선택일 표시는 WeekCalendar가 담당합니다.

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
        <div className="grid grid-cols-2 gap-2" ref={calendarRef}>
          <div className="col-span-2 text-sm text-slate-600">
            <span className="font-semibold">선택 날짜:</span> {selectedDateKey}
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
        {!budgetsByDate[selectedDateKey] || budgetsByDate[selectedDateKey].length === 0 ? (
          <p className="text-center text-sm text-slate-400">설명을 입력하십시오.</p>
        ) : (
          [selectedDateKey].map((d) => (
            <div key={d} className="rounded-md border border-slate-100 p-2">
              <div className="mb-1 text-xs font-semibold text-slate-500">{d}</div>
              {budgetsByDate[d]?.length === 0 ? (
                <div className="text-xs text-slate-400">설명</div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {budgetsByDate[d].map((it, idx) => {
                    // 실제 Y.Array 인덱스 사용
                    const realIndex = it.yArrayIndex ?? idx
                    let yDesc: Y.Text | null = null
                    if (doc) {
                      const yMap = doc.getMap('budgets') as Y.Map<unknown>
                      const yArr = yMap.get(d) as Y.Array<Y.Map<unknown>> | undefined
                      const yItem = yArr?.get(realIndex) as Y.Map<unknown> | undefined
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
