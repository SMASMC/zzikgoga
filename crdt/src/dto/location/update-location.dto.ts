/**
 * Update Location DTO
 */
export interface UpdateLocationDto {
  name?: string
  full_address?: string
  detail?: string | null
  latitude?: number | null
  longitude?: number | null
  sido?: string | null
  sigungu?: string | null
  road_name?: string | null
  building_num?: string | null
}
