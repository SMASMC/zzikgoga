/**
 * Create Schedule DTO
 */
export interface CreateScheduleDto {
  trip_id: number
  start_time: string
  offset_time?: string | null
  memo?: string | null
  has_location: boolean
}
