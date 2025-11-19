/**
 * Create Budget DTO
 */
export interface CreateBudgetDto {
  trip_id: number
  date: string
  category: string
  description?: string | null
  amount: number
}
