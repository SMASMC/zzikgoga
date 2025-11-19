// src/features/plan/hooks/useYTripDoc.ts

import { useEffect, useRef, useState, useCallback } from 'react'
import * as Y from 'yjs'
import { acquireProvider, releaseProvider } from '../stores/yjsStore'
import type { Awareness } from 'y-protocols/awareness'
import { dateKeyOf, formatLocalMinute, millisToHHMM, parseOffsetMinutes } from '../utils/time'

export interface YBudgetItem {
  id: number | null
  uid?: string
  category: string
  amount: number
  description: string
  yArrayIndex?: number
}

export interface YLocationItem {
  id?: number | null
  name: string
  full_address: string
  detail: string
  sido: string
  sigungu: string
  road_name: string
  building_num: string
  latitude: number | null
  longitude: number | null
}

export interface YScheduleItem {
  id: number | null
  uid: string
  start_time: string // 'YYYY-MM-DDTHH:mm'
  offset_time: string | null // 'HH:MM' or null
  has_location: boolean
  location: YLocationItem | null
  memo: string
  travel_duration?: number // 이동 시간(분)
  travel_distance?: number // 이동 거리(미터)
  yArrayIndex?: number
  rawKey?: string // Original key from schedulesMap
}

export interface TripInfoPlain {
  id?: number
  title?: string
  start_date?: string
  end_date?: string
}

/** ===== 포맷 보조 ===== */
const yTextToString = (v: unknown) => (v instanceof Y.Text ? v.toString() : String(v ?? ''))

const hhmmFromIsoLocal = (isoLocal: string) => {
  if (!isoLocal) return ''
  const s = isoLocal.replace('T', ' ')
  return s.length >= 16 ? s.slice(11, 16) : ''
}
const normalizeOffsetToHHMM = (raw?: string | null) => {
  if (!raw) return ''
  const m = String(raw).match(/^(\d{1,3}):(\d{2})$/)
  if (m) {
    const hh = String(Math.max(0, Number(m[1]) || 0)).padStart(2, '0')
    const mm = String(Math.min(59, Math.max(0, Number(m[2]) || 0))).padStart(2, '0')
    return `${hh}:${mm}`
  }
  // "24 hours" / "30 minutes" 등 보정
  let h = 0,
    min = 0
  const hr = String(raw).match(/(\d+)\s*hour/)
  if (hr) h = Number(hr[1]) || 0
  const mn = String(raw).match(/(\d+)\s*minute/)
  if (mn) min = Number(mn[1]) || 0
  const total = h * 60 + min
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** ===== 스냅샷 ===== */
const snapshotBudgets = (doc: Y.Doc): Record<string, YBudgetItem[]> => {
  const budgetsMap = doc.getMap('budgets') as Y.Map<Y.Array<Y.Map<unknown>>>
  const result: Record<string, YBudgetItem[]> = {}
  budgetsMap.forEach((yArr, dateKey) => {
    const items: YBudgetItem[] = []
    yArr.forEach((yMap, yArrayIndex) => {
      if (yMap.get('_deleted') === true) return
      const id = (yMap.get('id') as number) ?? null
      const uid = (yMap.get('uid') as string) ?? ''
      const category = (yMap.get('category') as string) ?? ''
      const amountRaw = yMap.get('amount') as unknown
      const amount = typeof amountRaw === 'number' ? amountRaw : Number(amountRaw ?? 0)
      const description = yTextToString(yMap.get('description'))
      items.push({ id, uid, category, amount, description, yArrayIndex })
    })
    result[dateKey] = items
  })
  return result
}

// useYTripDoc.ts 안
const snapshotSchedules = (doc: Y.Doc): Record<string, YScheduleItem[]> => {
  const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
  const result: Record<string, YScheduleItem[]> = {}

  const extractDayFromKey = (key: string): string => {
    // 예: "2025-11-12 03:06:00+09" | "2025-11-12T03:06" → "2025-11-12"
    const s = key.replace('T', ' ').trim()
    return s.slice(0, 10)
  }

  schedulesMap.forEach((yArr, rawKey) => {
    yArr.forEach((yMap, yArrayIndex) => {
      if (!(yMap instanceof Y.Map)) return
      if (yMap.get('_deleted') === true) return

      const id = (yMap.get('id') as number) ?? null
      const uid = (yMap.get('uid') as string) ?? ''
      const start_time = (yMap.get('start_time') as string) ?? ''
      const offset_time = (yMap.get('offset_time') as string | null) ?? null
      const has_location = Boolean(yMap.get('has_location'))
      const memo = yTextToString(yMap.get('memo'))
      const dayKey = start_time ? dateKeyOf(start_time) : extractDayFromKey(String(rawKey))

      const location = ((): YLocationItem | null => {
        const raw = yMap.get('location') as unknown
        if (!raw || typeof raw !== 'object') return null
        if (raw instanceof Y.Map) {
          const nameValue = raw.get('name')
          const name = nameValue instanceof Y.Text ? nameValue.toString() : String(nameValue ?? '')
          const detailValue = raw.get('detail')
          let detail =
            detailValue instanceof Y.Text ? detailValue.toString() : String(detailValue ?? '')
          // 앞뒤 따옴표 제거
          detail = detail.replace(/^["']|["']$/g, '')
          return {
            id: (raw.get('id') as number) ?? null,
            name,
            full_address: (raw.get('full_address') as string) ?? '',
            detail,
            sido: (raw.get('sido') as string) ?? '',
            sigungu: (raw.get('sigungu') as string) ?? '',
            road_name: (raw.get('road_name') as string) ?? '',
            building_num: (raw.get('building_num') as string) ?? '',
            latitude: (raw.get('latitude') as number) ?? null,
            longitude: (raw.get('longitude') as number) ?? null,
          }
        }
        const obj = raw as Record<string, unknown>
        let detail = (obj.detail as string) ?? ''
        // 앞뒤 따옴표 제거
        detail = detail.replace(/^["']|["']$/g, '')
        return {
          id: (obj.id as number) ?? null,
          name: (obj.name as string) ?? '',
          full_address: (obj.full_address as string) ?? '',
          detail,
          sido: (obj.sido as string) ?? '',
          sigungu: (obj.sigungu as string) ?? '',
          road_name: (obj.road_name as string) ?? '',
          building_num: (obj.building_num as string) ?? '',
          latitude: (obj.latitude as number) ?? null,
          longitude: (obj.longitude as number) ?? null,
        }
      })()

      // 이동 시간 및 거리 정보 추출
      const travel_duration = yMap.get('travel_duration') as number | undefined
      const travel_distance = yMap.get('travel_distance') as number | undefined

      if (!result[dayKey]) result[dayKey] = [] // 재선언/중복 없이 최초만 생성
      result[dayKey].push({
        id,
        uid,
        start_time,
        offset_time,
        has_location,
        location,
        memo,
        travel_duration,
        travel_distance,
        yArrayIndex,
        rawKey: String(rawKey), // Store the original key from schedulesMap
      })
    })
  })

  // 각 날짜별 일정을 시간순으로 정렬
  Object.keys(result).forEach((dateKey) => {
    result[dateKey].sort((a, b) => {
      // start_time을 기준으로 정렬
      const timeA = new Date(a.start_time).getTime()
      const timeB = new Date(b.start_time).getTime()

      // 시간이 같으면 yArrayIndex로 정렬 (원래 순서 유지)
      if (timeA === timeB) {
        return (a.yArrayIndex ?? 0) - (b.yArrayIndex ?? 0)
      }

      return timeA - timeB
    })
  })

  return result
}

/** ===== 순서 변경 시 시각 재흐름 ===== */
const reflowScheduleTimes = (yArr: Y.Array<Y.Map<unknown>>) => {
  if (yArr.length === 0) return
  let pointer: Date | null = null
  yArr.forEach((yItem) => {
    const startRaw = yItem.get('start_time')
    const fallback = new Date()
    let startDate = typeof startRaw === 'string' ? new Date(startRaw) : fallback
    if (!pointer) {
      pointer = new Date(startDate.getTime())
    } else {
      startDate = new Date(pointer.getTime())
      yItem.set('start_time', formatLocalMinute(startDate))
      const t = yItem.get('start_hhmm_text')
      const hhmm = hhmmFromIsoLocal(formatLocalMinute(startDate))
      if (t instanceof Y.Text) {
        t.delete(0, t.length)
        t.insert(0, hhmm)
      } else {
        yItem.set('start_hhmm_text', new Y.Text(hhmm))
      }
    }
    const offsetMinutes = parseOffsetMinutes(yItem.get('offset_time'))
    pointer = new Date(startDate.getTime() + Math.max(0, offsetMinutes) * 60000)
    if (pointer < startDate) pointer = new Date(startDate.getTime())
  })
}

/** ===== 훅 ===== */
export const useYTripDoc = (roomId: string) => {
  const providerRef = useRef<ReturnType<typeof acquireProvider> | null>(null)
  const [tripInfo, setTripInfo] = useState<TripInfoPlain>({})
  const [budgetsByDate, setBudgetsByDate] = useState<Record<string, YBudgetItem[]>>({})
  const [schedulesByDate, setSchedulesByDate] = useState<Record<string, YScheduleItem[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSynced, setIsSynced] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    const entry = acquireProvider(roomId)
    providerRef.current = entry
    const doc = entry.doc
    const provider = entry.provider

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

    const budgetsMap = doc.getMap('budgets') as Y.Map<unknown>
    const schedulesMap = doc.getMap('schedules') as Y.Map<unknown>
    const tripMap = doc.getMap('tripInfo') as Y.Map<unknown>

    // uid 보정 (observer 등록 전에 먼저 실행)
    const ensureUids = () => {
      doc.transact(() => {
        const sm = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
        sm.forEach((arr) => {
          arr.forEach((m) => {
            const u = m.get('uid') as string | undefined
            if (!u || typeof u !== 'string' || u.length < 5) {
              m.set('uid', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
            }
            // 협업용 타임 텍스트 필드 보정: 항상 아이템 고유 Y.Text
            const start = m.get('start_time') as string
            const off = m.get('offset_time') as string | null
            const sT = m.get('start_hhmm_text')
            const oT = m.get('offset_hhmm_text')
            const sVal = hhmmFromIsoLocal(start)
            const oVal = normalizeOffsetToHHMM(off ?? '00:00')
            if (sT instanceof Y.Text) {
              // OK
            } else {
              m.set('start_hhmm_text', new Y.Text(sVal))
            }
            if (oT instanceof Y.Text) {
              // OK
            } else {
              m.set('offset_hhmm_text', new Y.Text(oVal))
            }
          })
        })
      }, 'init-uids') // 초기화 origin 지정
    }
    ensureUids()

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
    tripMap.observeDeep(tripObserver)

    // 동기화 상태
    const handleSync = (synced: boolean) => {
      setIsSynced(synced)
      if (synced) {
        setIsLoading(false)
        setConnectionError(null)
        updateAll()
      }
    }
    const handleStatus = (event: { status: string }) => {
      if (event.status === 'disconnected') {
        setConnectionError('서버와의 연결이 끊어졌습니다.')
      }
    }
    provider.on('sync', handleSync)
    provider.on('status', handleStatus)

    if (provider.synced) {
      setIsSynced(true)
      setIsLoading(false)
      updateAll()
    }

    // 5초 타임아웃
    let syncedFlag = provider.synced
    const syncCheckHandler = (synced: boolean) => {
      syncedFlag = synced
    }
    provider.on('sync', syncCheckHandler)
    const timeout = setTimeout(() => {
      if (!syncedFlag) {
        const crdtUrl = import.meta.env.VITE_CRDT_URL || 'ws://localhost:3100'
        setConnectionError(`서버 연결 시간 초과. CRDT 서버(${crdtUrl}) 확인.`)
        setIsLoading(false)
      }
    }, 5000)

    return () => {
      clearTimeout(timeout)
      provider.off('sync', handleSync)
      provider.off('sync', syncCheckHandler)
      provider.off('status', handleStatus)
      budgetsMap.unobserveDeep(budgetsObserver)
      schedulesMap.unobserveDeep(schedulesObserver)
      tripMap.unobserveDeep(tripObserver)
      releaseProvider(roomId)
      providerRef.current = null
    }
  }, [roomId])

  /** ===== Budget ===== */
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
      yItem.set('uid', `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`)
      yItem.set('category', budget.category)
      yItem.set('amount', Number(budget.amount) || 0)
      yItem.set('description', new Y.Text((budget.description ?? '').toString()))
      yArr.push([yItem])
    },
    []
  )

  const removeBudget = useCallback((dateKey: string, keyOrId: string | number) => {
    const entry = providerRef.current
    if (!entry) return
    const { doc } = entry
    const budgetsMap = doc.getMap('budgets') as Y.Map<Y.Array<Y.Map<unknown>>>
    const yArr = budgetsMap.get(dateKey)
    if (!(yArr instanceof Y.Array)) return
    let target: Y.Map<unknown> | null = null
    for (let i = 0; i < yArr.length; i++) {
      const m = yArr.get(i)
      if (!(m instanceof Y.Map)) continue
      if (m.get('_deleted') === true) continue
      const id = m.get('id') as number | null
      const uid = m.get('uid') as string | undefined
      if (id === keyOrId || uid === keyOrId) {
        target = m
        break
      }
    }
    if (!target && typeof keyOrId === 'number') {
      let visible = 0
      for (let i = 0; i < yArr.length; i++) {
        const m = yArr.get(i)
        if (!(m instanceof Y.Map)) continue
        if (m.get('_deleted') === true) continue
        if (visible === keyOrId) {
          target = m
          break
        }
        visible++
      }
    }
    if (!target) return
    doc.transact(() => {
      target!.set('_deleted', true)
    }, 'remove-budget')
  }, [])

  /** ===== Schedule ===== */
  const addSchedule = useCallback(
    (payload: {
      startTimeLocal: string
      endTimeLocal?: string | null
      memo?: string
      location?: {
        name: string
        full_address?: string
        detail?: string
        sido?: string
        sigungu?: string
        road_name?: string
        building_num?: string
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
          offset = millisToHHMM(end.getTime() - start.getTime())
        } catch {
          offset = null
        }
      }
      yItem.set('offset_time', offset ?? '00:00')

      // ✨ 아이템 고유 협업 텍스트(공유 금지)
      yItem.set('start_hhmm_text', new Y.Text(hhmmFromIsoLocal(payload.startTimeLocal)))
      yItem.set('offset_hhmm_text', new Y.Text(normalizeOffsetToHHMM(offset ?? '00:00')))

      // memo
      const initialMemo = (payload.memo ?? '').replace(/\r\n/g, '\n').replace(/\n+$/, '')
      yItem.set('memo', new Y.Text(initialMemo))

      // location
      const loc = payload.location ?? null
      const rawName = typeof loc?.name === 'string' ? loc.name.trim() : ''
      const fallbackFromAddress =
        typeof loc?.full_address === 'string' ? loc.full_address.trim() : ''
      const finalName = rawName || fallbackFromAddress || '장소명 없음'
      const has_location = Boolean(loc && finalName.length > 0)
      yItem.set('has_location', has_location)
      if (has_location) {
        const locationMap = new Y.Map<unknown>()
        locationMap.set('id', null)
        locationMap.set('name', new Y.Text(finalName))
        locationMap.set('full_address', loc!.full_address ?? '')
        // detail의 앞뒤 따옴표 제거 후 Y.Text로 저장
        const cleanDetail = (loc!.detail ?? '').replace(/^["']|["']$/g, '')
        locationMap.set('detail', new Y.Text(cleanDetail))
        locationMap.set('sido', loc!.sido ?? '')
        locationMap.set('sigungu', loc!.sigungu ?? '')
        locationMap.set('road_name', loc!.road_name ?? '')
        locationMap.set('building_num', loc!.building_num ?? '')
        locationMap.set('latitude', loc!.latitude ?? null)
        locationMap.set('longitude', loc!.longitude ?? null)
        yItem.set('location', locationMap)
      } else {
        yItem.set('location', null)
      }

      yArr.push([yItem])
    },
    []
  )

  const updateScheduleTime = useCallback(
    (
      rawKey: string,
      yArrayIndex: number,
      updates: { startTimeLocal?: string; offsetHHMM?: string | null }
    ) => {
      const entry = providerRef.current
      if (!entry) return
      const { doc } = entry
      const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
      const yArr = schedulesMap.get(rawKey)
      if (!(yArr instanceof Y.Array)) {
        console.error(`[updateScheduleTime] yArr not found for rawKey=${rawKey}`)
        return
      }
      const yItem = yArr.get(yArrayIndex) as Y.Map<unknown> | undefined
      if (!yItem) {
        console.error(`[updateScheduleTime] yItem not found at index ${yArrayIndex}`)
        return
      }

      console.log(
        `[updateScheduleTime] rawKey=${rawKey}, yArrayIndex=${yArrayIndex}, updates=`,
        updates
      )

      const applyOffset = (map: Y.Map<unknown>) => {
        if (updates.offsetHHMM !== undefined) {
          const next = updates.offsetHHMM ?? '00:00'
          map.set('offset_time', next)
          const t = map.get('offset_hhmm_text')
          const val = normalizeOffsetToHHMM(next)
          if (t instanceof Y.Text) {
            t.delete(0, t.length)
            t.insert(0, val)
          } else {
            map.set('offset_hhmm_text', new Y.Text(val))
          }
        }
      }

      if (updates.startTimeLocal) {
        // For now, just update in place since each schedule is in its own Y.Array
        // We don't support moving schedules to different dates via this function
        doc.transact(() => {
          console.log(`[updateScheduleTime] Setting start_time to ${updates.startTimeLocal}`)
          yItem.set('start_time', updates.startTimeLocal!)
          const t = yItem.get('start_hhmm_text')
          const val = hhmmFromIsoLocal(updates.startTimeLocal!)
          if (t instanceof Y.Text) {
            t.delete(0, t.length)
            t.insert(0, val)
          } else {
            yItem.set('start_hhmm_text', new Y.Text(val))
          }
          applyOffset(yItem)
        }, 'update-schedule-time')
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
    if (fromIndex === toIndex || fromIndex < 0 || fromIndex >= yArr.length) return

    doc.transact(() => {
      const item = yArr.get(fromIndex)
      if (!item) return
      yArr.delete(fromIndex, 1)
      let insertIndex = toIndex
      if (insertIndex < 0) insertIndex = 0
      if (insertIndex > yArr.length) insertIndex = yArr.length
      if (fromIndex < toIndex) insertIndex = Math.max(0, insertIndex - 1)
      yArr.insert(insertIndex, [item])
      reflowScheduleTimes(yArr)
    }, 'reorder-schedule')
  }, [])

  const moveSchedule = useCallback(
    (sourceDateKey: string, fromIndex: number, targetDateKey: string, targetIndex: number) => {
      const entry = providerRef.current
      if (!entry) return
      const { doc } = entry
      const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
      const sourceArr = schedulesMap.get(sourceDateKey)
      if (!(sourceArr instanceof Y.Array)) return
      const item = sourceArr.get(fromIndex)
      if (!item) return

      doc.transact(() => {
        sourceArr.delete(fromIndex, 1)
        if (sourceArr.length === 0) schedulesMap.delete(sourceDateKey)
        else reflowScheduleTimes(sourceArr)

        let targetArr = schedulesMap.get(targetDateKey)
        if (!(targetArr instanceof Y.Array)) {
          targetArr = new Y.Array<Y.Map<unknown>>()
          schedulesMap.set(targetDateKey, targetArr)
        }
        let insertIndex = targetIndex
        if (insertIndex < 0) insertIndex = 0
        if (insertIndex > targetArr.length) insertIndex = targetArr.length
        targetArr.insert(insertIndex, [item])
        reflowScheduleTimes(targetArr)
      }, 'move-schedule')
    },
    []
  )

  const removeSchedule = useCallback((rawKey: string, yArrayIndex: number) => {
    console.log(`[removeSchedule] START - rawKey=${rawKey}, yArrayIndex=${yArrayIndex}`)

    const entry = providerRef.current
    if (!entry) {
      console.error('[removeSchedule] EARLY RETURN: providerRef.current is null')
      return
    }

    const { doc } = entry
    const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<unknown>>>
    const yArr = schedulesMap.get(rawKey)

    console.log(
      `[removeSchedule] yArr type: ${yArr ? yArr.constructor.name : 'null'}, instanceof Y.Array: ${yArr instanceof Y.Array}`
    )

    if (!(yArr instanceof Y.Array)) {
      console.error('[removeSchedule] EARLY RETURN: yArr is not Y.Array')
      return
    }

    console.log(
      `[removeSchedule] rawKey=${rawKey}, yArrayIndex=${yArrayIndex}, yArr.length=${yArr.length}`
    )

    // Debug: Log all items in the array
    console.log('[removeSchedule] Y.Array contents:')
    yArr.forEach((item, idx) => {
      if (item instanceof Y.Map) {
        console.log(
          `  [${idx}]: id=${item.get('id')}, uid=${item.get('uid')}, _deleted=${item.get('_deleted')}`
        )
      }
    })

    // Use the actual Y.Array index directly
    const target = yArr.get(yArrayIndex)
    if (!(target instanceof Y.Map)) {
      console.error(`[removeSchedule] target is not Y.Map at index ${yArrayIndex}`)
      return
    }

    console.log(
      `[removeSchedule] Marking as deleted: id=${target.get('id')}, uid=${target.get('uid')}`
    )
    doc.transact(() => {
      target.set('_deleted', true)
    }, 'remove-schedule')
  }, [])

  return {
    doc: providerRef.current?.doc ?? null,
    awareness: (providerRef.current?.awareness as Awareness) ?? null,
    tripInfo,
    budgetsByDate,
    schedulesByDate,
    isLoading,
    isSynced,
    connectionError,
    addBudget,
    addSchedule,
    updateScheduleTime,
    reorderSchedule,
    moveSchedule,
    removeBudget,
    removeSchedule,
  }
}
