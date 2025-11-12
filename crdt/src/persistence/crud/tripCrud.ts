import { pool } from '../../db'
import type { Trip } from '../types'

/**
 * Trip CRUD Operations
 */

/**
 * 새로운 Trip 생성
 */
export async function createTrip(data: {
  owner_id: number
  title: string
  start_date?: string
  end_date?: string
  male_count?: number
  female_count?: number
}): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO trip (owner_id, title, start_date, end_date, male_count, female_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      data.owner_id,
      data.title,
      data.start_date || null,
      data.end_date || null,
      data.male_count || 0,
      data.female_count || 0,
    ]
  )
  if (!result.rows[0]) {
    throw new Error('Failed to create trip')
  }
  return result.rows[0].id
}

/**
 * Trip ID로 조회
 */
export async function getTripById(tripId: number): Promise<Trip | null> {
  const result = await pool.query<Trip>(
    `SELECT id, owner_id, title, start_date, end_date,
            male_count, female_count, is_cost_completed, updated_at
     FROM trip
     WHERE id = $1`,
    [tripId]
  )
  return result.rows[0] || null
}

/**
 * Trip 제목 업데이트
 */
export async function updateTripTitle(tripId: number, title: string): Promise<void> {
  await pool.query(
    `UPDATE trip
     SET title = $1, updated_at = NOW()
     WHERE id = $2`,
    [title, tripId]
  )
}

/**
 * Trip 일반 필드 업데이트
 * 허용되는 필드: start_date, end_date, male_count, female_count, is_cost_completed
 */
export async function updateTripField(
  tripId: number,
  field: string,
  value: any
): Promise<void> {
  const allowedFields = [
    'start_date',
    'end_date',
    'male_count',
    'female_count',
    'is_cost_completed',
  ]

  if (!allowedFields.includes(field)) {
    console.warn(`[Trip CRUD] Ignored field update for "${field}" (not whitelisted)`)
    return
  }

  await pool.query(
    `UPDATE trip
     SET ${field} = $1, updated_at = NOW()
     WHERE id = $2`,
    [value, tripId]
  )
}

/**
 * Trip 삭제 (CASCADE로 관련 Schedule, Budget도 삭제됨)
 */
export async function deleteTrip(tripId: number): Promise<void> {
  await pool.query(`DELETE FROM trip WHERE id = $1`, [tripId])
}
