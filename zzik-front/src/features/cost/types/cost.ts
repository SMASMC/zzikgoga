// cost.ts

export interface CostItem {
  menuName: string
  amount: number
  memberIds: string[]
  count: number
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
