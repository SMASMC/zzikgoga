import { pool } from '../../db'
import { LocationEntity, ScheduleEntity } from '../../entities'

/**
 * Schedule CRUD Operations
 */

/**
 * 새로운 Schedule 생성
 */
export async function createSchedule(data: {
  trip_id: number
  start_time: string
  offset_time?: string | null
  memo?: string | null
  has_location?: boolean
}): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO schedule (trip_id, start_time, offset_time, memo, has_location)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      data.trip_id,
      data.start_time,
      data.offset_time || null,
      data.memo || null,
      data.has_location || false,
    ]
  )
  if (!result.rows[0]) {
    throw new Error('Failed to create schedule')
  }
  return result.rows[0].id
}

/**
 * Schedule ID로 조회
 */
export async function getScheduleById(scheduleId: number): Promise<ScheduleEntity | null> {
  const result = await pool.query<ScheduleEntity>(
    `SELECT id, trip_id, start_time, offset_time, memo, has_location, updated_at
     FROM schedule
     WHERE id = $1`,
    [scheduleId]
  )
  return result.rows[0] || null
}

/**
 * Trip ID로 모든 Schedule 조회
 */
export async function getSchedulesByTripId(tripId: number): Promise<ScheduleEntity[]> {
  const result = await pool.query<ScheduleEntity>(
    `SELECT id, trip_id, start_time, offset_time, memo, has_location, updated_at
     FROM schedule
     WHERE trip_id = $1
     ORDER BY start_time ASC, id ASC`,
    [tripId]
  )
  return result.rows
}

/**
 * Schedule 업데이트
 */
export async function updateSchedule(
  scheduleId: number,
  data: {
    start_time?: string
    offset_time?: string | null
    memo?: string | null
    has_location?: boolean
  }
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.start_time !== undefined) {
    fields.push(`start_time = $${paramIndex++}`)
    values.push(data.start_time)
  }
  if (data.offset_time !== undefined) {
    fields.push(`offset_time = $${paramIndex++}`)
    values.push(data.offset_time)
  }
  if (data.memo !== undefined) {
    fields.push(`memo = $${paramIndex++}`)
    values.push(data.memo)
  }
  if (data.has_location !== undefined) {
    fields.push(`has_location = $${paramIndex++}`)
    values.push(data.has_location)
  }

  if (fields.length === 0) {
    return // 업데이트할 필드가 없음
  }

  fields.push(`updated_at = NOW()`)
  values.push(scheduleId)

  await pool.query(
    `UPDATE schedule SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  )
}

/**
 * Schedule 삭제 (CASCADE로 Location도 삭제됨)
 */
export async function deleteSchedule(scheduleId: number): Promise<void> {
  await pool.query(`DELETE FROM schedule WHERE id = $1`, [scheduleId])
}

/**
 * Location CRUD Operations
 */

/**
 * 새로운 Location 생성
 */
export async function createLocation(data: {
  schedule_id: number
  name: string
  full_address: string
  detail?: string
  latitude?: number
  longitude?: number
  sido?: string
  sigungu?: string
  road_name?: string
  building_num?: string
}): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO location (
      schedule_id, name, full_address, detail, latitude, longitude,
      sido, sigungu, road_name, building_num
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id`,
    [
      data.schedule_id,
      data.name,
      data.full_address,
      data.detail,
      data.latitude,
      data.longitude,
      data.sido || null,
      data.sigungu || null,
      data.road_name || null,
      data.building_num || null,
    ]
  )
  if (!result.rows[0]) {
    throw new Error('Failed to create location')
  }
  return result.rows[0].id
}

/**
 * Location ID로 조회
 */
export async function getLocationById(locationId: number): Promise<LocationEntity | null> {
  const result = await pool.query<LocationEntity>(
    `SELECT id, schedule_id, name, full_address, detail, latitude, longitude,
            sido, sigungu, road_name, building_num
     FROM location
     WHERE id = $1`,
    [locationId]
  )
  return result.rows[0] || null
}

/**
 * Schedule ID로 Location 조회
 */
export async function getLocationByScheduleId(
  scheduleId: number
): Promise<LocationEntity | null> {
  const result = await pool.query<LocationEntity>(
    `SELECT id, schedule_id, name, full_address, detail, latitude, longitude,
            sido, sigungu, road_name, building_num
     FROM location
     WHERE schedule_id = $1`,
    [scheduleId]
  )
  console.log(`result: ${JSON.stringify(result.rows[0])}`)
  return result.rows[0] || null
}

/**
 * Location 업데이트
 */
export async function updateLocation(
  locationId: number,
  data: {
    name?: string
    full_address?: string
    detail?: string
    latitude?: number
    longitude?: number
    sido?: string
    sigungu?: string
    road_name?: string
    building_num?: string
  }
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`)
    values.push(data.name)
  }
  if (data.full_address !== undefined) {
    fields.push(`full_address = $${paramIndex++}`)
    values.push(data.full_address)
  }
  if (data.detail !== undefined) {
    fields.push(`detail = $${paramIndex++}`)
    values.push(data.detail)
  }
  if (data.latitude !== undefined) {
    fields.push(`latitude = $${paramIndex++}`)
    values.push(data.latitude)
  }
  if (data.longitude !== undefined) {
    fields.push(`longitude = $${paramIndex++}`)
    values.push(data.longitude)
  }
  if (data.sido !== undefined) {
    fields.push(`sido = $${paramIndex++}`)
    values.push(data.sido)
  }
  if (data.sigungu !== undefined) {
    fields.push(`sigungu = $${paramIndex++}`)
    values.push(data.sigungu)
  }
  if (data.road_name !== undefined) {
    fields.push(`road_name = $${paramIndex++}`)
    values.push(data.road_name)
  }
  if (data.building_num !== undefined) {
    fields.push(`building_num = $${paramIndex++}`)
    values.push(data.building_num)
  }

  if (fields.length === 0) {
    return // 업데이트할 필드가 없음
  }

  values.push(locationId)

  await pool.query(
    `UPDATE location SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  )
}

/**
 * Location 삭제
 */
export async function deleteLocation(locationId: number): Promise<void> {
  await pool.query(`DELETE FROM location WHERE id = $1`, [locationId])
}

/**
 * Schedule ID로 Location 삭제
 */
export async function deleteLocationByScheduleId(scheduleId: number): Promise<void> {
  await pool.query(`DELETE FROM location WHERE schedule_id = $1`, [scheduleId])
}
