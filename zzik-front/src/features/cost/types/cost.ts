// cost.ts

export interface CostItem {
  menuName: string
  amount: number
  memberIds: string[]
  count: number
}

export interface CostReciptItem {
  name: string
  count: number
  price: number
}

export interface CostPlusRequest {
  payerId: string
  paidAt: string
  place: string
  totalAmount: number
  memo: string
  receiptJson: string | null
  items: CostItem[]
}

export interface CostListResponse {
  costId: number
  paidAt: string
  place: string
  payerName: string
  payerId: string
  payerThumbnailUrl: string
  totalAmount: number
}

export interface CostListApiResponse {
  costs: CostListResponse[]
  totalCostCount: number
  totalCost: number
}
export interface CostReciptRequest {
  file: File
}

export interface CostReciptResponse {
  tripId: number
  storeName: string
  date: string
  cardCompany: string
  cardNumber: string
  totalPrice: number
  items: CostReciptItem[]
}
