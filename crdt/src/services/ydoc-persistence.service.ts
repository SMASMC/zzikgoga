/**
 * Y.Doc Persistence Service
 * Y.Doc 변경을 감지하여 DB에 저장하는 서비스
 */
import * as Y from 'yjs'
import {
  updateTripTitle,
  updateTripField,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  createLocation,
  updateLocation,
  deleteLocationByScheduleId,
  createBudget,
  updateBudget,
  deleteBudget,
} from '../persistence/repositories'

const DB_UPDATE_ORIGIN = 'db_update'

/**
 * Debounce 관리
 */
const debouncers = new Map<string, NodeJS.Timeout>()

function debounce(id: string, func: () => void, delay = 2000) {
  const t = debouncers.get(id)
  if (t) clearTimeout(t)
  debouncers.set(
    id,
    setTimeout(() => {
      func()
      debouncers.delete(id)
    }, delay)
  )
}

function cancelDebounce(id: string) {
  const t = debouncers.get(id)
  if (t) {
    clearTimeout(t)
    debouncers.delete(id)
  }
}

/**
 * 유틸 함수들
 */
function normalizeMemo(text: string): string {
  let s = (text || '').replace(/\r\n/g, '\n')
  s = s.replace(/[\s\n]+$/, '')
  const idx = s.indexOf('\n')
  if (idx > 0) {
    const left = s.slice(0, idx).trimEnd()
    const right = s.slice(idx + 1).trimEnd()
    if (left.length > 0 && left === right) return left
  }
  return s
}

function fromAnyToIntervalString(v: any): string | null {
  if (v == null) return null
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s || s === '[object Object]') return null
    return s
  }
  if (typeof v === 'object') {
    const { years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0 } = v as any
    const parts: string[] = []
    if (years) parts.push(`${years} years`)
    if (months) parts.push(`${months} months`)
    if (days) parts.push(`${days} days`)
    if (hours) parts.push(`${hours} hours`)
    if (minutes) parts.push(`${minutes} minutes`)
    if (seconds) parts.push(`${seconds} seconds`)
    return parts.length ? parts.join(' ') : '0 seconds'
  }
  return null
}

function asNumberId(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && /^\d+$/.test(v)) {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function isUserOrigin(tr: Y.Transaction): boolean {
  return tr.origin !== 'db_load' && tr.origin !== DB_UPDATE_ORIGIN
}

function normalizeLocation(raw: unknown): {
  id: number | null
  name: string
  full_address: string
  detail: string | null
  latitude: number | null
  longitude: number | null
  sido: string | null
  sigungu: string | null
  road_name: string | null
  building_num: string | null
} | null {
  if (!raw) return null

  // Y.Map인 경우 안전하게 꺼내기 (name이 Y.Text일 수도 있음)
  if (raw instanceof Y.Map) {
    const nameVal = raw.get('name') as unknown
    const name = nameVal instanceof Y.Text ? nameVal.toString() : String(nameVal ?? '')

    return {
      id: (raw.get('id') as number) ?? null,
      name,
      full_address: (raw.get('full_address') as string) ?? '',
      detail: (raw.get('detail') as string) ?? null,
      latitude: (raw.get('latitude') as number) ?? null,
      longitude: (raw.get('longitude') as number) ?? null,
      sido: (raw.get('sido') as string) ?? null,
      sigungu: (raw.get('sigungu') as string) ?? null,
      road_name: (raw.get('road_name') as string) ?? null,
      building_num: (raw.get('building_num') as string) ?? null,
    }
  }

  // 일반 object인 경우
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    return {
      id: (obj.id as number) ?? null,
      name: (obj.name as string) ?? '',
      full_address: (obj.full_address as string) ?? '',
      detail: (obj.detail as string) ?? null,
      latitude: (obj.latitude as number) ?? null,
      longitude: (obj.longitude as number) ?? null,
      sido: (obj.sido as string) ?? null,
      sigungu: (obj.sigungu as string) ?? null,
      road_name: (obj.road_name as string) ?? null,
      building_num: (obj.building_num as string) ?? null,
    }
  }

  return null
}

/**
 * YDocPersistenceService
 */
export class YDocPersistenceService {
  // Observer 중복 등록 방지를 위한 추적
  private observedScheduleArrays = new WeakSet<Y.Array<any>>()
  private observedScheduleItems = new WeakSet<Y.Map<any>>()
  private observedBudgetArrays = new WeakSet<Y.Array<any>>()
  private observedBudgetItems = new WeakSet<Y.Map<any>>()

  /**
   * Y.Doc에 observer 설정하여 변경사항을 DB에 반영
   * @param doc Y.Doc 인스턴스
   */
  setupPersistence(doc: Y.Doc): void {
    const tripInfo = doc.getMap('tripInfo')
    const tripId = (tripInfo.get('id') as number) ?? -1
    console.log(`[YDocPersistenceService] Setting up persistence for trip ${tripId}`)

    // TripInfo observer (deep)
    this.observeTripInfo(tripInfo, tripId)

    // Schedules observer
    const schedulesMap = doc.getMap('schedules') as Y.Map<Y.Array<Y.Map<any>>>
    this.observeSchedules(schedulesMap, tripId, doc)

    // Budgets observer
    const budgetsMap = doc.getMap('budgets') as Y.Map<Y.Array<Y.Map<any>>>
    this.observeBudgets(budgetsMap, tripId, doc)

    console.log(`[YDocPersistenceService] Persistence listeners attached for trip ${tripId}`)
  }

  private observeTripInfo(tripInfo: Y.Map<any>, tripId: number): void {
    tripInfo.observeDeep((events: Y.YEvent<any>[], tr: Y.Transaction) => {
      if (!isUserOrigin(tr)) return

      for (const event of events) {
        // Y.Text 변경 감지 (title)
        if (event instanceof Y.YTextEvent) {
          const titleValue = tripInfo.get('title')
          if (titleValue instanceof Y.Text) {
            this.scheduleTripTitleSave(tripId, titleValue)
          }
        }
        // Map 키 변경 감지
        else if (event instanceof Y.YMapEvent) {
          event.keysChanged.forEach((key) => {
            if (key === 'title') {
              const titleValue = tripInfo.get('title')
              if (titleValue instanceof Y.Text) {
                this.scheduleTripTitleSave(tripId, titleValue)
              }
            } else {
              const newValue = tripInfo.get(key)
              this.scheduleTripFieldSave(tripId, key, newValue)
            }
          })
        }
      }
    })
  }

  private observeSchedules(schedulesMap: Y.Map<Y.Array<Y.Map<any>>>, tripId: number, doc: Y.Doc): void {
    // 기존 schedule 배열에 observer 설정
    for (const [dateKey, yDayArray] of schedulesMap.entries()) {
      if (!yDayArray) continue
      this.observeScheduleDayArray(yDayArray, tripId, dateKey)
    }

    // 새로운 dateKey 추가 감지
    schedulesMap.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
      if (!isUserOrigin(tr)) return
      for (const [key, change] of event.changes.keys) {
        if (change.action === 'add') {
          const dateKey = String(key)
          const yDayArray = schedulesMap.get(dateKey) as Y.Array<Y.Map<any>> | undefined
          if (yDayArray) {
            this.observeScheduleDayArray(yDayArray, tripId, dateKey)
          }
        }
      }
    })
  }

  private observeBudgets(budgetsMap: Y.Map<Y.Array<Y.Map<any>>>, tripId: number, doc: Y.Doc): void {
    // 기존 budget 배열에 observer 설정
    for (const [dateKey, yDayArray] of budgetsMap.entries()) {
      if (!yDayArray) continue
      this.observeBudgetDayArray(yDayArray, tripId, dateKey)
    }

    // 새로운 dateKey 추가 감지
    budgetsMap.observe((event: Y.YMapEvent<any>, tr: Y.Transaction) => {
      if (!isUserOrigin(tr)) return
      for (const [key, change] of event.changes.keys) {
        if (change.action === 'add') {
          const dateKey = String(key)
          const yDayArray = budgetsMap.get(dateKey) as Y.Array<Y.Map<any>> | undefined
          if (yDayArray) {
            this.observeBudgetDayArray(yDayArray, tripId, dateKey)
          }
        }
      }
    })
  }

  // Trip 관련
  private scheduleTripTitleSave(tripId: number, titleText: Y.Text): void {
    debounce(`trip:${tripId}:title`, () => {
      const newTitle = titleText.toString()
      updateTripTitle(tripId, newTitle).catch((err) => {
        console.error('[YDocPersistenceService] Failed to update trip.title:', err)
      })
    })
  }

  private scheduleTripFieldSave(tripId: number, key: string, value: any): void {
    debounce(`trip:${tripId}:${key}`, () => {
      updateTripField(tripId, key, value).catch((err) => {
        console.error(`[YDocPersistenceService] Failed to update trip.${key}:`, err)
      })
    })
  }

  // Schedule 관련
  private async upsertScheduleItem(tripId: number, scheduleItem: Y.Map<any>, dateKey: string): Promise<void> {
    const id = scheduleItem.get('id') as number | undefined
    const uid = scheduleItem.get('uid') as string | undefined
    const isDeleted = scheduleItem.get('_deleted') === true

    if (isDeleted && id) {
      try {
        await deleteSchedule(id)
        console.log(`[YDocPersistenceService] Schedule deleted: ${id}`)
      } catch (err) {
        console.error('[YDocPersistenceService] Failed to delete schedule:', err)
      }
      return
    }

    if (isDeleted && !id) {
      console.log(`[YDocPersistenceService] Skipping delete - no DB id yet for uid=${uid}`)
      return
    }

    const start_time = scheduleItem.get('start_time') as string
    const rawOffset = scheduleItem.get('offset_time')
    const offset_time = fromAnyToIntervalString(rawOffset)
    const memoVal = scheduleItem.get('memo')
    const rawMemo = memoVal instanceof Y.Text ? memoVal.toString() : (memoVal ?? '')
    const memo = normalizeMemo(String(rawMemo))
    const has_location = !!scheduleItem.get('has_location')
    const loc = normalizeLocation(scheduleItem.get('location'))

    try {
      let scheduleId = id
      if (!scheduleId) {
        scheduleId = await createSchedule({ trip_id: tripId, start_time, offset_time, memo, has_location })
        Y.transact(scheduleItem.doc!, () => {
          scheduleItem.set('id', scheduleId)
        }, DB_UPDATE_ORIGIN)
      } else {
        await updateSchedule(scheduleId, { start_time, offset_time, memo, has_location })
      }

      if (has_location && loc) {
        const payload = {
          name: loc.name,
          full_address: loc.full_address ?? '',
          detail: loc.detail ?? '',
          latitude: loc.latitude ?? 0,
          longitude: loc.longitude ?? 0,
          sido: loc.sido ?? '',
          sigungu: loc.sigungu ?? '',
          road_name: loc.road_name ?? '',
          building_num: loc.building_num ?? '',
        }

        if (loc.id) {
          await updateLocation(loc.id, payload)
        } else {
          const newLocId = await createLocation({
            schedule_id: scheduleId,
            ...payload,
          })
          Y.transact(scheduleItem.doc!, () => {
            scheduleItem.set('location', { ...loc, id: newLocId })
          }, DB_UPDATE_ORIGIN)
        }
      } else {
        await deleteLocationByScheduleId(scheduleId)
      }
    } catch (err) {
      console.error('[YDocPersistenceService] upsertScheduleItem failed:', err)
    }
  }

  private observeScheduleDayArray(yDayArray: Y.Array<Y.Map<any>>, tripId: number, dateKey: string): void {
    // 이미 observer가 등록된 배열이면 스킵
    if (this.observedScheduleArrays.has(yDayArray)) {
      return
    }
    this.observedScheduleArrays.add(yDayArray)

    yDayArray.observe((event: Y.YArrayEvent<Y.Map<any>>, tr: Y.Transaction) => {
      if (!isUserOrigin(tr)) return

      // 추가된 아이템 처리
      event.changes.added.forEach((item) => {
        for (const addedVal of item.content.getContent()) {
          if (addedVal instanceof Y.Map) {
            const keyId = (addedVal.get('id') ?? addedVal.get('uid') ?? 'new') as string | number
            // 아이템 observer와 동일한 debounce key 사용하여 중복 방지
            debounce(`schedule:${tripId}:${dateKey}:${keyId}`, () => {
              this.upsertScheduleItem(tripId, addedVal, dateKey)
            })
            this.hookScheduleItemObservers(addedVal, tripId, dateKey)
          }
        }
      })
    })

    // 기존 요소 observer
    yDayArray.toArray().forEach((schedMap) => {
      this.hookScheduleItemObservers(schedMap, tripId, dateKey)
    })
  }

  private hookScheduleItemObservers(scheduleItem: Y.Map<any>, tripId: number, dateKey: string): void {
    // 이미 observer가 등록된 아이템이면 스킵
    if (this.observedScheduleItems.has(scheduleItem)) {
      return
    }
    this.observedScheduleItems.add(scheduleItem)

    // Map 변경
    scheduleItem.observe((_evt: Y.YMapEvent<any>, tr: Y.Transaction) => {
      if (!isUserOrigin(tr)) return
      const keyId = (scheduleItem.get('id') ?? scheduleItem.get('uid') ?? 'new') as string | number
      // 배열 observer와 동일한 debounce key 사용하여 중복 방지
      debounce(`schedule:${tripId}:${dateKey}:${keyId}`, () => {
        this.upsertScheduleItem(tripId, scheduleItem, dateKey)
      })
    })

    // Memo 텍스트 변경
    const memoVal = scheduleItem.get('memo')
    if (memoVal instanceof Y.Text) {
      memoVal.observe((_textEvt: Y.YTextEvent, tr: Y.Transaction) => {
        if (!isUserOrigin(tr)) return
        const keyId = (scheduleItem.get('id') ?? scheduleItem.get('uid') ?? 'new') as string | number
        // 통일된 debounce key 사용
        debounce(`schedule:${tripId}:${dateKey}:${keyId}`, () => {
          this.upsertScheduleItem(tripId, scheduleItem, dateKey)
        })
      })
    }
  }

  // Budget 관련
  private async upsertBudgetItem(tripId: number, budgetItem: Y.Map<any>, dateKey: string): Promise<void> {
    const id = budgetItem.get('id') as number | undefined
    const isDeleted = budgetItem.get('_deleted') === true

    if (isDeleted && id) {
      try {
        await deleteBudget(id)
        console.log(`[YDocPersistenceService] Budget deleted: ${id}`)
      } catch (err) {
        console.error('[YDocPersistenceService] Failed to delete budget:', err)
      }
      return
    }

    const category = budgetItem.get('category') as string
    const amount = budgetItem.get('amount') as number
    const descVal = budgetItem.get('description')
    const description = descVal instanceof Y.Text ? descVal.toString() : (descVal ?? '')

    try {
      let budgetId = id
      if (!budgetId) {
        budgetId = await createBudget({ trip_id: tripId, date: dateKey, category, description, amount })
        Y.transact(budgetItem.doc!, () => {
          budgetItem.set('id', budgetId)
        }, DB_UPDATE_ORIGIN)
      } else {
        await updateBudget(budgetId, { category, description, amount })
      }
    } catch (err) {
      console.error('[YDocPersistenceService] upsertBudgetItem failed:', err)
    }
  }

  private observeBudgetDayArray(yDayArray: Y.Array<Y.Map<any>>, tripId: number, dateKey: string): void {
    // 이미 observer가 등록된 배열이면 스킵
    if (this.observedBudgetArrays.has(yDayArray)) {
      return
    }
    this.observedBudgetArrays.add(yDayArray)

    yDayArray.observe((event: Y.YArrayEvent<Y.Map<any>>, tr: Y.Transaction) => {
      if (!isUserOrigin(tr)) return

      // 추가된 아이템 처리
      event.changes.added.forEach((item) => {
        for (const addedVal of item.content.getContent()) {
          if (addedVal instanceof Y.Map) {
            const keyId = (addedVal.get('id') ?? addedVal.get('uid') ?? 'new') as string | number
            // 아이템 observer와 동일한 debounce key 사용하여 중복 방지
            debounce(`budget:${tripId}:${dateKey}:${keyId}`, () => {
              this.upsertBudgetItem(tripId, addedVal, dateKey)
            })
            this.hookBudgetItemObservers(addedVal, tripId, dateKey)
          }
        }
      })
    })

    // 기존 요소 observer
    yDayArray.toArray().forEach((budgetItem) => {
      this.hookBudgetItemObservers(budgetItem, tripId, dateKey)
    })
  }

  private hookBudgetItemObservers(budgetItem: Y.Map<any>, tripId: number, dateKey: string): void {
    // 이미 observer가 등록된 아이템이면 스킵
    if (this.observedBudgetItems.has(budgetItem)) {
      return
    }
    this.observedBudgetItems.add(budgetItem)

    budgetItem.observe((_evt, tr) => {
      if (!isUserOrigin(tr)) return
      const keyId = budgetItem.get('id') ?? budgetItem.get('uid') ?? 'new'
      // 배열 observer와 동일한 debounce key 사용하여 중복 방지
      debounce(`budget:${tripId}:${dateKey}:${keyId}`, () => {
        this.upsertBudgetItem(tripId, budgetItem, dateKey)
      })
    })

    const descVal = budgetItem.get('description')
    if (descVal instanceof Y.Text) {
      descVal.observe((_textEvt, tr) => {
        if (!isUserOrigin(tr)) return
        const keyId = budgetItem.get('id') ?? budgetItem.get('uid') ?? 'new'
        // 통일된 debounce key 사용
        debounce(`budget:${tripId}:${dateKey}:${keyId}`, () => {
          this.upsertBudgetItem(tripId, budgetItem, dateKey)
        })
      })
    }
  }
}

// Singleton instance
export const ydocPersistenceService = new YDocPersistenceService()
