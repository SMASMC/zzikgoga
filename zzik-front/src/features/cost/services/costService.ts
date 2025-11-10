import { apiClient } from '@/shared/api/client'
import {
  CostPlusRequest,
  CostListApiResponse,
  CostReciptResponse,
  CostReciptRequest,
} from '@/features/cost/types/cost'

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

export class CostReciptService {
  public static async uploadReceipt(
    tripId: string,
    receiptRequest: CostReciptRequest
  ): Promise<CostReciptResponse> {
    const formData = new FormData()
    formData.append('file', receiptRequest.file)
    const response = await apiClient.post<CostReciptResponse>(`/cost/${tripId}/receipt`, formData)
    return response
  }

  //   public static async getCostDetail(tripId: string): Promise<CostReciptResponse> {
  //     const response = await apiClient.get<CostReciptResponse>(`/cost/${tripId}/receipt`)
  //     return response
  //   }
}
