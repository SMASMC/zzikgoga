export type MemoryStatus = string

export type MemoryBlockType = 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'image'

export type MemoryBlock = {
  id: string
  type: MemoryBlockType
  data: {
    // paragraph/heading: text
    // image: url(+optional caption)
    text?: string
    url?: string
    caption?: string
  }
}

export type MemoryContent = {
  blocks: MemoryBlock[]
}

export type CreateMemoryRequest = {
  title: string
  content: MemoryContent
  status: MemoryStatus
}

export type MemoryEntity = {
  memoryId: number
  tripId: number
  memberId: number
  uploaderName: string
  title: string
  status: MemoryStatus
  content: MemoryContent
  pdfUrl: string | null
  arweaveUrl: string | null
  nftId: number | null
  mintStatus: string
  mintHash: string | null
  storageType: string | null
  createdAt: string
  updatedAt: string
}

export type MemoryPdfResponse = {
  memoryId: number
  pdfUrl: string
  storageType: string
}

export type TripPhoto = {
  id: number
  memberId: number
  uploaderName: string
  s3Url: string
  uploadedAt: string
}

export type TripPhotoListResponse = {
  tripId: number
  photos: TripPhoto[]
  pageInfo: {
    nextCursor?: number | null
  }
}
