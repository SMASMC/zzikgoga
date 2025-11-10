// cost.ts

export type CostCategory = 'STAY' | 'FOOD' | 'TRANSPORT' | 'SHOPPING' | 'LEISURE' | 'ETC'

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  STAY: '숙박',
  FOOD: '식비',
  TRANSPORT: '교통',
  SHOPPING: '쇼핑',
  LEISURE: '여가',
  ETC: '기타',
}

export const COST_CATEGORIES: CostCategory[] = [
  'STAY',
  'FOOD',
  'TRANSPORT',
  'SHOPPING',
  'LEISURE',
  'ETC',
]

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
  category: CostCategory
  totalAmount: number
  memo: string
  receiptJson: string | null
  items: CostItem[]
}

export interface CostListResponse {
  costId: number
  paidAt: string
  place: string
  category: CostCategory
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
