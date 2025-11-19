/**
 * Trip Entity
 * DB 테이블: trip
 */
export interface TripEntity {
  id: number
  title: string
  start_date: string
  end_date: string
  updated_at?: string
  created_at?: string
}
