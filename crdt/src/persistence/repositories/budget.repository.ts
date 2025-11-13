// src/persistence/crud/budgetCrud.ts

import { pool } from '../../db'
import type { BudgetEntity } from '../../entities'

/**
 * Budget CRUD Operations
 */

/**
 * 새로운 Budget 생성
 */
export async function createBudget(data: {
  trip_id: number
  date: string
  category: string
  description?: string | null
  amount: number
}): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `INSERT INTO budget (trip_id, date, category, description, amount)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [data.trip_id, data.date, data.category, data.description || null, data.amount]
  )
  if (!result.rows[0]) {
    throw new Error('Failed to create budget')
  }
  return result.rows[0].id
}

/**
 * Budget ID로 조회
 */
export async function getBudgetById(budgetId: number): Promise<BudgetEntity | null> {
  const result = await pool.query<BudgetEntity>(
    `SELECT id, trip_id, date, category, description, amount
     FROM budget
     WHERE id = $1`,
    [budgetId]
  )
  return result.rows[0] || null
}

/**
 * Trip ID로 모든 Budget 조회
 */
export async function getBudgetsByTripId(tripId: number): Promise<BudgetEntity[]> {
  const result = await pool.query<BudgetEntity>(
    `SELECT id, trip_id, date, category, description, amount
     FROM budget
     WHERE trip_id = $1
     ORDER BY date ASC, id ASC`,
    [tripId]
  )
  return result.rows
}

/**
 * Trip ID와 날짜로 Budget 조회
 */
export async function getBudgetsByDate(
  tripId: number,
  date: string
): Promise<BudgetEntity[]> {
  const result = await pool.query<BudgetEntity>(
    `SELECT id, trip_id, date, category, description, amount
     FROM budget
     WHERE trip_id = $1 AND date = $2
     ORDER BY id ASC`,
    [tripId, date]
  )
  return result.rows
}

/**
 * Budget 업데이트
 */
export async function updateBudget(
  budgetId: number,
  data: {
    date?: string
    category?: string
    description?: string | null
    amount?: number
  }
): Promise<void> {
  const fields: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (data.date !== undefined) {
    fields.push(`date = $${paramIndex++}`)
    values.push(data.date)
  }
  if (data.category !== undefined) {
    fields.push(`category = $${paramIndex++}`)
    values.push(data.category)
  }
  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`)
    values.push(data.description)
  }
  if (data.amount !== undefined) {
    fields.push(`amount = $${paramIndex++}`)
    values.push(data.amount)
  }

  if (fields.length === 0) {
    return // 업데이트할 필드가 없음
  }

  fields.push(`updated_at = NOW()`)
  values.push(budgetId)

  await pool.query(
    `UPDATE budget SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  )
}

/**
 * Budget 삭제
 */
export async function deleteBudget(budgetId: number): Promise<void> {
  await pool.query(`DELETE FROM budget WHERE id = $1`, [budgetId])
}

/**
 * Trip ID로 모든 Budget 삭제
 */
export async function deleteBudgetsByTripId(tripId: number): Promise<void> {
  await pool.query(`DELETE FROM budget WHERE trip_id = $1`, [tripId])
}

/**
 * Trip ID와 날짜로 Budget 삭제
 */
export async function deleteBudgetsByDate(tripId: number, date: string): Promise<void> {
  await pool.query(`DELETE FROM budget WHERE trip_id = $1 AND date = $2`, [tripId, date])
}
