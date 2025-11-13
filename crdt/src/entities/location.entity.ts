/**
 * Location Entity
 * DB 테이블: location
 */
export interface LocationEntity {
  id: number
  schedule_id: number
  name: string
  full_address: string
  detail: string | null
  latitude: number | null
  longitude: number | null
  sido: string | null
  sigungu: string | null
  road_name: string | null
  building_num: string | null
  updated_at?: string
  created_at?: string
}
