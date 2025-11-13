/**
 * Update Schedule DTO
 */
export interface UpdateScheduleDto {
  start_time?: string
  offset_time?: string | null
  memo?: string | null
  has_location?: boolean
}
