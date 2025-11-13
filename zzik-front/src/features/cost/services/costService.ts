import { apiClient } from '@/shared/api/client'
import {
  CostPlusRequest,
  CostListApiResponse,
  CostReciptResponse,
  CostReciptRequest,
  CostDetailResponse,
  CostModifyRequest,
  CostModifyResponse,
  CostDeleteResponse,
} from '@/features/cost/types/cost'
import { SettleResponse, SettleAcceptRequest, SettleAcceptResponse, SettleFinalResponse } from '@/features/cost/types/settle'

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

  public static async deleteCost(tripId: number, costId: number): Promise<CostDeleteResponse> {
    const response = await apiClient.delete<CostDeleteResponse>(`/cost/${tripId}/${costId}`)
    return response
  }
}

export class CostModifyService {
  public static async modifyCost(
    tripId: number,
    costId: number,
    costRequest: CostModifyRequest
  ): Promise<CostModifyResponse> {
    const response = await apiClient.put<CostModifyResponse>(
      `/cost/${tripId}/${costId}`,
      costRequest
    )
    return response
  }
}
export class CostSettleService {
  public static async getSettle(tripId: number): Promise<SettleResponse> {
    const response = await apiClient.get<SettleResponse>(`/cost/${tripId}/stat`)
    return response
  }

  public static async acceptSettle(tripId: number, acceptRequest: SettleAcceptRequest): Promise<SettleAcceptResponse> {
    const response = await apiClient.put<SettleAcceptResponse>(`/cost/${tripId}/accept`, acceptRequest)
    return response
  }

  public static async getSettleFinal(tripId: number): Promise<SettleFinalResponse> {
    const response = await apiClient.get<SettleFinalResponse>(`/cost/${tripId}/calculate`)
    return response
  }
}

