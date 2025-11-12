// cost.ts
// cost 관련 타입 정리
// 수정 락은 코드 길어짐 방지 및 용도 구분을 위해 editLockState.ts에 정의!

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
  // category: CostCategory
  totalAmount: number
  memo: string
  receiptJson: string | null
  items: CostItem[]
}

export interface CostListResponse {
  costId: number
  paidAt: string
  place: string
  // category: CostCategory
  payerName: string
  payerId: number
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

export interface CostDetailResponse {
  costId: number
  createdBy: number
  payerId: number
  paidAt: string
  place: string
  totalAmount: number
  memo: string | null
  receiptJson: string | null
  items: CostItem[]
}
// 결제 내역 수정
export interface CostModifyRequest {
  paidAt: string
  place: string
  payerId: number
  memo: string | null
  menus: CostMenu[]
}
export interface CostMenu {
  costMenuId: number
  menuName: string
  count: number
  amount: number
  payerIds: number[]
}

export interface CostModifyResponse {
  costId: number
  paidAt: string
  place: string
  payerId: number
  payerName: string
  totalAmount: number
  memo: string | null
  menus: ModifyCostMenu[]
}
export interface ModifyCostMenu {
  costMenuId: number
  menuName: string
  count: number
  amount: number
  payers: Array<{ memberId: number; memberName: string }>
}
