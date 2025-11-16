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

const BudgetAmountEditor = ({ yItem }: { yItem: Y.Map<unknown> }) => {
  // 1) 렌더 중 문서 수정 금지: 로컬 상태로 보관
  const [amountText, setAmountText] = useState<Y.Text | null>(null)

  // 2) 마운트 이후(커밋 단계) 문서에 필드 보장
  useEffect(() => {
    let mounted = true
    const existing = yItem.get('amount_text')

    if (existing instanceof Y.Text) {
      if (mounted) setAmountText(existing)
      return () => {
        mounted = false
      }
    }

    const currentAmount = yItem.get('amount') as number | undefined
    const y = new Y.Text(typeof currentAmount === 'number' ? String(currentAmount) : '')

    // 문서 변경은 커밋 이후에!
    yItem.doc?.transact(() => {
      yItem.set('amount_text', y)
    }, 'init-budget-amount-text')

    if (mounted) setAmountText(y)
    return () => {
      mounted = false
    }
  }, [yItem])

  // 3) 숫자 동기화 옵저버도 amountText 준비된 뒤에만 등록
  useEffect(() => {
    if (!amountText) return

    const syncToNumber = () => {
      const raw = amountText.toString().replace(/[^0-9]/g, '')
      const num = raw.length ? Number(raw) : 0
      const prev = yItem.get('amount') as number | undefined
      if (prev !== num) {
        yItem.doc?.transact(() => {
          yItem.set('amount', num)
        }, 'update-budget-amount')
      }
    }

    // 초기 1회 동기화 + 관찰 시작
    syncToNumber()
    amountText.observe(syncToNumber)
    return () => amountText.unobserve(syncToNumber)
  }, [amountText, yItem])

  // 4) 데이터 없을 때 예외 처리(로딩 가드)
  if (!amountText) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <input
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs opacity-50 bg-slate-50"
            placeholder="금액"
            disabled
          />
        </div>
        <span className="text-[10px] font-semibold text-slate-400">원</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <div className="flex-1">
        <YTextEditor
          ytext={amountText}
          singleLine={true}
          variant="input"
          placeholder="금액"
          numericOnly={true}
          size="xs"
        />
      </div>
      <span className="text-[10px] font-semibold text-slate-500">원</span>
    </div>
  )
}

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

  const totalForSelected = useMemo(() => {
    const list = budgetsByDate[selectedDateKey] ?? []
    return list.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
  }, [budgetsByDate, selectedDateKey])

  const categoryStats = useMemo(() => {
    const list = budgetsByDate[selectedDateKey] ?? []
    const stats: Record<CostCategory, number> = {
      STAY: 0,
      FOOD: 0,
      TRANSPORT: 0,
      SHOPPING: 0,
      LEISURE: 0,
      ETC: 0,
    }
    list.forEach((item) => {
      const cat = item.category as CostCategory
      if (cat in stats) {
        stats[cat] += Number(item.amount) || 0
      }
    })
    return stats
  }, [budgetsByDate, selectedDateKey])

  return (
    <aside className="flex w-full min-h-0 flex-col gap-3 border-l border-slate-200 bg-white p-3 md:w-1/4">
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
        <h2 className="text-3xl font-bold text-slate-800">예산</h2>
        <p className="mt-0.5 text-xs text-slate-400">예산을 입력할 수 있습니다.</p>
      </header>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-2.5 shadow-sm">
        <div className="text-[10px] text-slate-500 font-semibold px-0.5">
          선택 날짜: <span className="text-slate-700">{selectedDateKey}</span>
        </div>

        {/* 한 줄: 카테고리 + 금액 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1" ref={calendarRef}>
          <DropdownSelect
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(value) => setCategory(value as CostCategory)}
            placeholder="카테고리"
            className="w-full sm:w-28 text-[11px] [&>button]:py-1 [&>button]:px-2.5 [&>button]:text-[11px]"
          />

          {/* 금액 입력 with prefix/suffix */}
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
              ₩
            </span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="금액"
              value={amount}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/[^0-9]/g, '')
                setAmount(numericValue) // 숫자만 상태에 저장 (메모리 낭비/파싱 오류 방지)
              }}
              size="xs"
              className="pl-5 pr-6"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
              원
            </span>
          </div>
        </div>

        {/* 설명은 다음 줄 */}
        <Input
          type="text"
          placeholder="설명 (선택사항)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size="xs"
        />

        <SolidButton
          onClick={handleAdd}
          disabled={!category || !amount}
          className="text-white rounded-full text-xs py-1"
        >
          + 예산 추가
        </SolidButton>
      </div>

      <div className="flex flex-1 min-h-0 flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5">
        <h3 className="text-xs font-bold text-slate-600 mb-0.5">예산 목록</h3>
        {!budgetsByDate[selectedDateKey] || budgetsByDate[selectedDateKey].length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-center text-xs text-slate-400">예산을 추가해주세요</p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {budgetsByDate[selectedDateKey].map((it, idx) => {
              // 실제 Y.Array 인덱스 사용
              const realIndex = it.yArrayIndex ?? idx
              let yDesc: Y.Text | null = null
              let yItemRef: Y.Map<unknown> | null = null
              if (doc) {
                const yMap = doc.getMap('budgets') as Y.Map<unknown>
                const yArr = yMap.get(selectedDateKey) as Y.Array<Y.Map<unknown>> | undefined
                const yItem = yArr?.get(realIndex) as Y.Map<unknown> | undefined
                yItemRef = yItem ?? null
                const desc = yItem?.get('description')
                if (desc instanceof Y.Text) yDesc = desc
              }
              return (
                <li
                  key={`${selectedDateKey}-${it.id ?? 'n'}-${idx}`}
                  className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex-1 min-w-0">
                      {yItemRef ? (
                        <DropdownSelect
                          options={CATEGORY_OPTIONS}
                          value={it.category as CostCategory}
                          onChange={(value) => {
                            const next = value as CostCategory
                            yItemRef!.doc?.transact(() => {
                              yItemRef!.set('category', next)
                            }, 'update-budget-category')
                          }}
                          className="text-[11px] max-w-[120px] [&>button]:py-1 [&>button]:px-2.5 [&>button]:text-[11px]"
                        />
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-700">
                          {COST_CATEGORY_LABELS[it.category as CostCategory] || it.category}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBudget(selectedDateKey, it.id ?? it.uid!)}
                      className="rounded-full border border-red-200 px-1.5 py-0.5 text-[9px] font-semibold text-red-500 transition hover:border-red-400 hover:bg-red-50 flex-shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mb-1.5">
                    {yItemRef ? (
                      <div className="flex-1">
                        <BudgetAmountEditor yItem={yItemRef} />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-slate-700">
                        {it.amount.toLocaleString()}원
                      </span>
                    )}
                  </div>
                  {yDesc && (
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-md p-1.5">
                      <YTextEditor ytext={yDesc} variant="plain" size="xs" />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {/* 카테고리별 통계는 총 예산 호버 시 툴팁으로 표시 */}

      <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 p-3 shadow-md relative group">
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-emerald-700">총 예산</span>
          <span className="text-emerald-900 font-bold text-xl">
            {totalForSelected.toLocaleString()} 원
          </span>
        </div>
        <div className="pointer-events-none absolute right-3 bottom-full mb-2 w-56 rounded-lg border border-slate-200 bg-white p-2.5 shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-50">
          <div className="text-xs font-bold text-slate-700 mb-1.5">카테고리별 예산</div>
          <ul className="space-y-0.5">
            {COST_CATEGORIES.map((cat) => {
              const amount = categoryStats[cat]
              const percentage = totalForSelected > 0 ? (amount / totalForSelected) * 100 : 0
              return (
                <li key={cat} className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">{COST_CATEGORY_LABELS[cat]}</span>
                  <span className="text-slate-900 font-semibold">
                    {amount.toLocaleString()}원
                    <span className="ml-1 text-[10px] text-slate-500">
                      {percentage > 0 ? percentage.toFixed(1) : '0'}%
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </aside>
  )
}
export default BudgetPanel
