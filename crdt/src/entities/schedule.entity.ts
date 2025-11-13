/**
 * Schedule Entity
 * DB 테이블: schedule
 */
export interface ScheduleEntity {
  id: number
  trip_id: number
  start_time: string
  offset_time: string | null
  memo: string | null
  has_location: boolean
  updated_at?: string
  created_at?: string
}
