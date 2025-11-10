import { apiClient } from '@/shared/api/client'
import { CostPlusRequest } from '@/features/cost/types/cost'

export class CostPlusService {
  public static async addCost(tripId: string, costRequest: CostPlusRequest): Promise<void> {
    await apiClient.post(`/cost/${tripId}`, costRequest)
  }
}
