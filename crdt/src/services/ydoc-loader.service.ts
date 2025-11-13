/**
 * Y.Doc Loader Service
 * DB에서 데이터를 로드하여 Y.Doc을 생성하는 서비스
 */
import * as Y from 'yjs'
import {
  getTripById,
  getSchedulesByTripId,
  getBudgetsByTripId,
  getLocationByScheduleId,
} from '../persistence/repositories'

/**
 * 유틸: 날짜/타임스탬프에서 "YYYY-MM-DD" 문자열 추출
 */
function toDateKey(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') {
    const parts = value.split('T')
    return parts[0] ?? value
  }
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(value)
}

/**
 * 유틸: PG numeric/decimal → number
 */
function toNumber(v: any): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v)
  return Number(v)
}

/**
 * 유틸: Postgres interval → string
 */
function toPostgresIntervalString(v: any): string | null {
  if (v == null) return null
  if (typeof v === 'string') {
    const s = v.trim()
    return s.length ? s : null
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

/**
 * 유틸: ISO string 변환
 */
function toIsoString(v: any): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (v instanceof Date) {
    return v.toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).replace(' ', 'T')
  }
  return String(v)
}

/**
 * YDocLoaderService
 */
export class YDocLoaderService {
  /**
   * DB에서 trip 데이터를 로드하여 Y.Doc을 채움
   * @param tripId Trip ID
   * @param doc Y.Doc 인스턴스
   * @returns 채워진 Y.Doc
   */
  async loadTripData(tripId: number, doc: Y.Doc): Promise<Y.Doc> {
    console.log(`[YDocLoaderService] Loading trip ${tripId}...`)

    try {
      // 1. Trip 정보 조회
      const tripRow = await getTripById(tripId)
      if (!tripRow) {
        throw new Error(`Trip ${tripId} not found`)
      }

      // 2. Schedules 조회
      const schedules = await getSchedulesByTripId(tripId)

      // 3. 각 Schedule의 Location 조회
      const scheduleWithLocations = await Promise.all(
        schedules.map(async (schedule) => {
          const location = schedule.has_location
            ? await getLocationByScheduleId(schedule.id)
            : null
          return { schedule, location }
        })
      )

      // 4. Budgets 조회
      const budgets = await getBudgetsByTripId(tripId)

      // 5. 날짜별로 그룹화
      const schedulesByDate = new Map<string, typeof scheduleWithLocations>()
      for (const item of scheduleWithLocations) {
        const dateKey = toDateKey(item.schedule.start_time)
        if (!schedulesByDate.has(dateKey)) {
          schedulesByDate.set(dateKey, [])
        }
        schedulesByDate.get(dateKey)!.push(item)
      }

      const budgetsByDate = new Map<string, typeof budgets>()
      for (const b of budgets) {
        const dateKey = toDateKey(b.date)
        if (!budgetsByDate.has(dateKey)) {
          budgetsByDate.set(dateKey, [])
        }
        budgetsByDate.get(dateKey)!.push(b)
      }

      // 6. Y.Doc에 데이터 삽입 (transaction으로 묶어서 observer 방지)
      Y.transact(
        doc,
        () => {
          // TripInfo
          const tripInfoMap = doc.getMap('tripInfo')
          tripInfoMap.clear()
          tripInfoMap.set('id', tripRow.id)
          tripInfoMap.set('title', new Y.Text(tripRow.title || ''))
          tripInfoMap.set('start_date', toDateKey(tripRow.start_date))
          tripInfoMap.set('end_date', toDateKey(tripRow.end_date))

          // Schedules
          const schedulesMap = doc.getMap('schedules')
          schedulesMap.clear()

          for (const [dateKey, items] of schedulesByDate.entries()) {
            const yDayArray = new Y.Array<Y.Map<any>>()
            schedulesMap.set(dateKey, yDayArray)

            for (const { schedule, location } of items) {
              const yScheduleItem = new Y.Map<any>()
              yScheduleItem.set('id', schedule.id)
              yScheduleItem.set('uid', `db-${schedule.id}`)
              const localTime = toIsoString(schedule.start_time).slice(0, 16)
              yScheduleItem.set('start_time', localTime)
              const offsetStr = toPostgresIntervalString(schedule.offset_time)
              yScheduleItem.set('offset_time', offsetStr)
              yScheduleItem.set('memo', new Y.Text(schedule.memo || ''))
              yScheduleItem.set('has_location', !!schedule.has_location)

              if (schedule.has_location && location) {
                yScheduleItem.set('location', {
                  id: location.id,
                  name: location.name,
                  full_address: location.full_address,
                  detail: location.detail,
                  latitude: location.latitude,
                  longitude: location.longitude,
                })
              } else {
                yScheduleItem.set('location', null)
              }

              yDayArray.push([yScheduleItem])
            }
          }

          // Budgets
          const budgetsMap = doc.getMap('budgets')
          budgetsMap.clear()

          for (const [dateKey, items] of budgetsByDate.entries()) {
            const yDayArray = new Y.Array<Y.Map<any>>()
            budgetsMap.set(dateKey, yDayArray)

            for (const b of items) {
              const yBudgetItem = new Y.Map<any>()
              yBudgetItem.set('id', b.id)
              yBudgetItem.set('uid', `db-${b.id}`)
              yBudgetItem.set('category', b.category)
              yBudgetItem.set('amount', toNumber(b.amount))
              yBudgetItem.set('description', new Y.Text(b.description || ''))

              yDayArray.push([yBudgetItem])
            }
          }
        },
        'db_load'
      )

      console.log(`[YDocLoaderService] Trip ${tripId} loaded successfully`)
      return doc
    } catch (error) {
      console.error(`[YDocLoaderService] Failed to load trip ${tripId}:`, error)
      throw error
    }
  }
}

// Singleton instance
export const ydocLoaderService = new YDocLoaderService()
