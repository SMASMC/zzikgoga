/**
 * Budget Entity
 * DB 테이블: budget
 */
export interface BudgetEntity {
  id: number
  trip_id: number
  date: string
  category: string
  description: string | null
  amount: number
  updated_at?: string
  created_at?: string
}
