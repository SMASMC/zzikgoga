import { apiClient } from '@/shared/api/client'
import {
  CostPlusRequest,
  CostListApiResponse,
  CostReciptResponse,
  CostReciptRequest,
  CostDetailResponse,
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
}
export class CostDetailService {
    public static async getCostDetail(tripId: number, costId: number): Promise<CostDetailResponse> {
        const response = await apiClient.get<CostDetailResponse>(`/cost/${tripId}/${costId}`)
        return response
    }
}
