import { apiClient } from '@/shared/api/client'
import { CostPlusRequest, CostListApiResponse } from '@/features/cost/types/cost'

export class CostPlusService {
  public static async addCost(tripId: string, costRequest: CostPlusRequest): Promise<void> {
    await apiClient.post(`/cost/${tripId}`, costRequest)
  }
}
export class CostListService {
  public static async getCostList(tripId: string): Promise<CostListApiResponse> {
    const response = await apiClient.get<CostListApiResponse>(`/cost/${tripId}`)
    return response
  }
}