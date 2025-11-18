import { apiClient } from '@/shared/api/client'
import {
  CreateMemoryRequest,
  MemoryEntity,
  MemoryPdfResponse,
  MemoryNftInfoResponse,
  MemoryNftOwnershipResponse,
  TripPhotoListResponse,
} from '@/features/memory/types/memory'

export class MemoryService {
  static async putMemory(tripId: string, payload: CreateMemoryRequest): Promise<MemoryEntity> {
    const res = await apiClient.put<MemoryEntity>(`/memory/${tripId}`, payload)
    return res
  }

  static async getMemory(tripId: string): Promise<MemoryEntity> {
    const res = await apiClient.get<MemoryEntity>(`/memory/${tripId}`)
    return res
  }

  static async mintNft(tripId: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>(`/memory/nft/${tripId}`)
    return res
  }

  static async getNftInfo(tripId: string): Promise<MemoryNftInfoResponse> {
    const res = await apiClient.get<MemoryNftInfoResponse>(`/memory/nft/${tripId}`)
    return res
  }

  static async getNftOwnership(tripId: string): Promise<MemoryNftOwnershipResponse> {
    const res = await apiClient.get<MemoryNftOwnershipResponse>(`/memory/nft/${tripId}/ownership`)
    return res
  }

  static async convertToPdf(tripId: string): Promise<MemoryPdfResponse> {
    const res = await apiClient.post<MemoryPdfResponse>(`/memory/${tripId}/convert/pdf`)
    return res
  }
}

export class MemoryPhotoService {
  static async getTripPhotos(tripId: string, cursor?: number): Promise<TripPhotoListResponse> {
    const query = typeof cursor === 'number' ? `?cursor=${cursor}` : ''
    const res = await apiClient.get<TripPhotoListResponse>(`/media/${tripId}${query}`)
    return res
  }
}

export class MediaService {
  static async uploadMedia(tripId: string, files: File[]): Promise<void> {
    const fd = new FormData()
    for (const f of files) {
      fd.append('files', f)
    }
    await apiClient.post<void>(`/media/${tripId}`, fd)
  }
}
