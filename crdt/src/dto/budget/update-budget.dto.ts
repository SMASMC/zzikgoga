/**
 * Update Budget DTO
 */
export interface UpdateBudgetDto {
  date?: string
  category?: string
  description?: string | null
  amount?: number
}
