import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { acquireProvider, releaseProvider } from '../stores/yjsStore'
import type { Awareness } from 'y-protocols/awareness'

export interface YBudgetItem {
  id: number | null
  category: string
  amount: number
  description: string
}

export interface YLocationItem {
  id?: number | null
  name: string
  full_address: string
  detail: string
  latitude: number | null
  longitude: number | null
}

export interface YScheduleItem {
  id: number | null
  uid: string
  start_time: string // 'YYYY-MM-DDTHH:mm'
  offset_time: string | null // 'HH:MM' string or null
  has_location: boolean
  location: YLocationItem | null
  memo: string
}

export interface TripInfoPlain {
  id?: number
  title?: string
  start_date?: string
  end_date?: string
}

const yTextToString = (v: unknown) => (v instanceof Y.Text ? v.toString() : String(v ?? ''))

const toOffsetHHMM = (ms: number): string | null => {
  if (!Number.isFinite(ms) || ms <= 0) return null
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  return `${hh}:${mm}`
}

const dateKeyOf = (isoLocalMinute: string) => isoLocalMinute.slice(0, 10)

const snapshotBudgets = (doc: Y.Doc): Record<string, YBudgetItem[]> => {
  const budgetsMap = doc.getMap('budgets') as Y.Map<Y.Array<Y.Map<unknown>>>
  const result: Record<string, YBudgetItem[]> = {}

  budgetsMap.forEach((yArr, dateKey) => {
    const items: YBudgetItem[] = []
    yArr.forEach((yMap) => {
      const id = (yMap.get('id') as number) ?? null
      const category = (yMap.get('category') as string) ?? ''
      const amountRaw = yMap.get('amount') as unknown
      const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw ?? 0)
      const description = yTextToString(yMap.get('description'))
      items.push({ id, category, amount, description })
    })
    result[dateKey] = items
  })

  return result
}

const snapshotSchedules = (doc: Y.Doc): Record<string, YScheduleItem[]> => {
  const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
  const result: Record<string, YScheduleItem[]> = {}

  schedulesMap.forEach((yArr, dateKey) => {
    const items: YScheduleItem[] = []
    yArr.forEach((yMap) => {
      const id = (yMap.get('id') as number) ?? null
      const uid = (yMap.get('uid') as string) ?? ''
      const start_time = (yMap.get('start_time') as string) ?? ''
      const offset_time = (yMap.get('offset_time') as string | null) ?? null
      const has_location = Boolean(yMap.get('has_location'))
      const memo = yTextToString(yMap.get('memo'))
      const location = ((): YLocationItem | null => {
        const raw = yMap.get('location') as unknown
        if (!raw || typeof raw !== 'object') return null
        const obj = raw as Record<string, unknown>
        return {
          id: (obj.id as number) ?? null,
          name: (obj.name as string) ?? '',
          full_address: (obj.full_address as string) ?? '',
          detail: (obj.detail as string) ?? '',
          latitude: (obj.latitude as number) ?? null,
          longitude: (obj.longitude as number) ?? null,
        }
      })()
      items.push({ id, uid, start_time, offset_time, has_location, location, memo })
    })
    result[dateKey] = items
  })

  return result
}

const parseOffsetMinutes = (value: unknown): number => {
  if (typeof value !== 'string') return 0
  const match = value.match(/^(\d{1,3}):(\d{2})$/)
  if (!match) return 0
  const hours = Number(match[1]) || 0
  const minutes = Number(match[2]) || 0
  return hours * 60 + minutes
}

const formatLocalMinute = (date: Date): string => {
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const ensureSequentialScheduleTimes = (yArr: Y.Array<Y.Map<unknown>>) => {
  let pointer: Date | null = null
  yArr.forEach((yItem) => {
    const startRaw = yItem.get('start_time')
    if (typeof startRaw !== 'string') {
      return
    }
    let startDate = new Date(startRaw)
    if (!pointer) {
      pointer = new Date(startDate.getTime())
    } else if (startDate < pointer) {
      startDate = new Date(pointer.getTime())
      yItem.set('start_time', formatLocalMinute(startDate))
    } else {
      pointer = new Date(startDate.getTime())
    }
    const offsetMinutes = parseOffsetMinutes(yItem.get('offset_time'))
    if (offsetMinutes > 0) {
      pointer = new Date(startDate.getTime() + offsetMinutes * 60000)
    }
  })
}

export const useYTripDoc = (roomId: string) => {
  const providerRef = useRef<ReturnType<typeof acquireProvider> | null>(null)
  const [tripInfo, setTripInfo] = useState<TripInfoPlain>({})
  const [budgetsByDate, setBudgetsByDate] = useState<Record<string, YBudgetItem[]>>({})
  const [schedulesByDate, setSchedulesByDate] = useState<Record<string, YScheduleItem[]>>({})

  useEffect(() => {
    const entry = acquireProvider(roomId)
    providerRef.current = entry

    const doc = entry.doc
    const updateAll = () => {
      const tripMap = doc.getMap('tripInfo')
      setTripInfo({
        id: (tripMap.get('id') as number) ?? undefined,
        title: yTextToString(tripMap.get('title') as unknown),
        start_date: (tripMap.get('start_date') as string) ?? undefined,
        end_date: (tripMap.get('end_date') as string) ?? undefined,
      })
      setBudgetsByDate(snapshotBudgets(doc))
      setSchedulesByDate(snapshotSchedules(doc))
    }

    // Initial snapshot
    updateAll()

    const budgetsMap = doc.getMap('budgets') as Y.Map<unknown>
    const schedulesMap = doc.getMap('schedules') as Y.Map<unknown>
    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>

    const budgetsObserver = () => setBudgetsByDate(snapshotBudgets(doc))
    const schedulesObserver = () => setSchedulesByDate(snapshotSchedules(doc))
    const tripObserver = () => {
      const t = doc.getMap('tripInfo')
      setTripInfo({
        id: (t.get('id') as number) ?? undefined,
        title: yTextToString(t.get('title') as unknown),
        start_date: (t.get('start_date') as string) ?? undefined,
        end_date: (t.get('end_date') as string) ?? undefined,
      })
    }

    budgetsMap.observeDeep(budgetsObserver)
    schedulesMap.observeDeep(schedulesObserver)
    tripMap.observe(tripObserver)

    // Ensure each schedule item has a stable uid
    const ensureUids = () => {
      const sm = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
      sm.forEach((arr) => {
        arr.forEach((m) => {
          const u = m.get('uid') as string | undefined
          if (!u || typeof u !== 'string' || u.length < 5) {
            m.set('uid', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
          }
        })
      })
    }
    ensureUids()

    return () => {
      budgetsMap.unobserveDeep(budgetsObserver)
      schedulesMap.unobserveDeep(schedulesObserver)
      tripMap.unobserve(tripObserver)
      releaseProvider(roomId)
      providerRef.current = null
    }
  }, [roomId])

  const addBudget = useCallback(
    (dateKey: string, budget: { category: string; amount: number; description?: string }) => {
      const entry = providerRef.current
      if (!entry) return
      const { doc } = entry
      const budgetsMap = doc.getMap('budgets') as Y.Map<Y.Array<Y.Map<unknown>>>
      let yArr = budgetsMap.get(dateKey)
      if (!(yArr instanceof Y.Array)) {
        yArr = new Y.Array<Y.Map<unknown>>()
        budgetsMap.set(dateKey, yArr)
      }
      const yItem = new Y.Map<unknown>()
      yItem.set('id', null)
      yItem.set('category', budget.category)
      yItem.set('amount', Number(budget.amount) || 0)
      yItem.set('description', new Y.Text(budget.description ?? ''))
      yArr.push([yItem])
    },
    []
  )

  const addSchedule = useCallback(
    (payload: {
      startTimeLocal: string // 'YYYY-MM-DDTHH:mm'
      endTimeLocal?: string | null // optional; used to compute offset_time
      memo?: string
      location?: {
        name: string
        full_address?: string
        detail?: string
        latitude?: number | null
        longitude?: number | null
      } | null
    }) => {
      const entry = providerRef.current
      if (!entry) return
      const { doc } = entry

      const dateKey = dateKeyOf(payload.startTimeLocal)
      const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
      let yArr = schedulesMap.get(dateKey)
      if (!(yArr instanceof Y.Array)) {
        yArr = new Y.Array<Y.Map<unknown>>()
        schedulesMap.set(dateKey, yArr)
      }
      const yItem = new Y.Map<unknown>()
      yItem.set('id', null)
      yItem.set('uid', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
      yItem.set('start_time', payload.startTimeLocal)

      let offset: string | null = null
      if (payload.endTimeLocal) {
        try {
          const start = new Date(payload.startTimeLocal)
          const end = new Date(payload.endTimeLocal)
          const ms = end.getTime() - start.getTime()
          offset = toOffsetHHMM(ms)
        } catch {
          offset = null
        }
      }
      yItem.set('offset_time', offset)
      const initialMemo = (payload.memo ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '')
      yItem.set('memo', new Y.Text(initialMemo))
      const has_location = Boolean(payload.location)
      yItem.set('has_location', has_location)
      // mark creator client as seed owner to avoid double seeding
      try {
        const clientID = (doc as unknown as { clientID?: number }).clientID
        if (typeof clientID === 'number') {
          yItem.set('seed_owner', clientID)
        }
      } catch {
        //
      }
      yItem.set(
        'location',
        has_location
          ? {
              id: null,
              name: payload.location!.name,
              full_address: payload.location!.full_address ?? '',
              detail: payload.location!.detail ?? '',
              latitude: payload.location!.latitude ?? null,
              longitude: payload.location!.longitude ?? null,
            }
          : null
      )
      yArr.push([yItem])
    },
    []
  )

  const updateScheduleTime = useCallback(
    (
      dateKey: string,
      index: number,
      updates: { startTimeLocal?: string; offsetHHMM?: string | null }
    ) => {
      const entry = providerRef.current
      if (!entry) return
      const { doc } = entry
      const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
      const yArr = schedulesMap.get(dateKey)
      if (!(yArr instanceof Y.Array)) return
      const yItem = yArr.get(index) as Y.Map<unknown> | undefined
      if (!yItem) return

      const applyOffset = (map: Y.Map<unknown>) => {
        if (updates.offsetHHMM !== undefined) {
          map.set('offset_time', updates.offsetHHMM)
        }
      }

      if (updates.startTimeLocal) {
        const newDateKey = dateKeyOf(updates.startTimeLocal)
        if (newDateKey === dateKey) {
          // same day: in-place update
          doc.transact(() => {
            yItem.set('start_time', updates.startTimeLocal!)
            applyOffset(yItem)
          }, 'update-schedule-time')
        } else {
          // cross-day move: clone to a fresh map and preserve uid
          doc.transact(() => {
            const snapshot = {
              id: (yItem.get('id') as number) ?? null,
              uid: (yItem.get('uid') as string) ?? '',
              has_location: Boolean(yItem.get('has_location')),
              location: yItem.get('location') as unknown,
              memo: yItem.get('memo') as unknown,
              offset_time: (yItem.get('offset_time') as string | null) ?? null,
            }
            const newMap = new Y.Map<unknown>()
            newMap.set('id', snapshot.id)
            // preserve stable uid so memo collaboration field remains the same
            if (snapshot.uid) newMap.set('uid', snapshot.uid)
            newMap.set('start_time', updates.startTimeLocal!)
            newMap.set('has_location', snapshot.has_location)
            // copy memo as plain text into a fresh Y.Text to avoid cross-parent insert
            const memoText = (
              snapshot.memo instanceof Y.Text
                ? snapshot.memo.toString()
                : String(snapshot.memo ?? '')
            )
              .replace(/\r\n/g, '\n')
              .replace(/\n+$/, '')
            newMap.set('memo', new Y.Text(memoText))
            // location can be plain object or null
            newMap.set(
              'location',
              snapshot.location && typeof snapshot.location === 'object'
                ? { ...(snapshot.location as object) }
                : null
            )
            // offset_time
            newMap.set(
              'offset_time',
              updates.offsetHHMM !== undefined ? updates.offsetHHMM : snapshot.offset_time
            )

            let nextArr = schedulesMap.get(newDateKey)
            if (!(nextArr instanceof Y.Array)) {
              nextArr = new Y.Array<Y.Map<unknown>>()
              schedulesMap.set(newDateKey, nextArr)
            }
            nextArr.push([newMap])
            // remove old item last
            yArr.delete(index, 1)
            // if the old array is empty, remove the date key entirely
            if (yArr.length === 0) {
              schedulesMap.delete(dateKey)
            }
          }, 'move-schedule-day')
        }
      } else {
        doc.transact(() => applyOffset(yItem), 'update-schedule-offset')
      }
    },
    []
  )

  const reorderSchedule = useCallback((dateKey: string, fromIndex: number, toIndex: number) => {
    const entry = providerRef.current
    if (!entry) return
    const { doc } = entry
    const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
    const yArr = schedulesMap.get(dateKey)
    if (!(yArr instanceof Y.Array)) return
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= yArr.length) {
      return
    }

    doc.transact(() => {
      const item = yArr.get(fromIndex)
      if (!item) {
        return
      }

      yArr.delete(fromIndex, 1)
      let insertIndex = toIndex
      if (insertIndex < 0) insertIndex = 0
      if (insertIndex > yArr.length) insertIndex = yArr.length
      if (fromIndex < toIndex) {
        insertIndex = Math.max(0, insertIndex - 1)
      }
      yArr.insert(insertIndex, [item])
      ensureSequentialScheduleTimes(yArr)
    }, 'reorder-schedule')
  }, [])

  return {
    doc: providerRef.current?.doc ?? null,
    awareness: (providerRef.current?.awareness as Awareness) ?? null,
    tripInfo,
    budgetsByDate,
    schedulesByDate,
    addBudget,
    addSchedule,
    updateScheduleTime,
    reorderSchedule,
  }
}
