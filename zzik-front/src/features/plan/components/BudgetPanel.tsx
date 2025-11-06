import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import SolidButton from '@/components/atoms/SolidButton'
import Input from '@/components/atoms/Input'
import { useYTripDoc } from '../hooks/useYTripDoc'
import YTextEditor from './YTextEditor'
import * as Y from 'yjs'

const todayKey = () => new Date().toISOString().slice(0, 10)

const BudgetPanel = () => {
  const { tripId } = useParams<{ tripId: string }>()
  const roomId = useMemo(
    () => (tripId && tripId.trim().length > 0 ? `trip-${tripId.trim()}` : 'trip-default'),
    [tripId]
  )

  const { budgetsByDate, addBudget, doc } = useYTripDoc(roomId)

  const [date, setDate] = useState<string>(todayKey())
  const [category, setCategory] = useState<string>('카테고리')
  const [amount, setAmount] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  const handleAdd = () => {
    const amt = Number(amount)
    if (!date || !category.trim() || !Number.isFinite(amt)) {
      return
    }
    addBudget(date, { category: category.trim(), amount: amt, description: description.trim() })
    setAmount('')
    setDescription('')
  }

  return (
    <aside className="flex w-full flex-col gap-4 border-l border-slate-200 bg-white p-4 md:w-1/4">
      <header>
        <h2 className="text-lg font-semibold text-slate-800">예산</h2>
        <p className="mt-1 text-xs text-slate-400">예산을 입력할 수 있습니다.</p>
      </header>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            type="text"
            placeholder="카테고리"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
        <SolidButton onClick={handleAdd} className="bg-emerald-500 text-white hover:bg-emerald-600">
          추가하기
        </SolidButton>
      </div>

      <div className="flex max-h-80 flex-col gap-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
        {Object.keys(budgetsByDate).length === 0 ? (
          <p className="text-center text-xs text-slate-400">설명을 입력하십시오.</p>
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
                          <div className="flex items-center justify-between">
                            <span className="text-slate-700">{it.category}</span>
                            <span className="text-slate-600">{it.amount.toLocaleString()}원</span>
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
