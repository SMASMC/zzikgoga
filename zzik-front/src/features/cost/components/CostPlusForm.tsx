import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { User } from '@/features/auth/types/auth'
// import { CostCategory, CostItem, CostPlusRequest } from '@/features/cost/types/cost'
import { CostItem, CostPlusRequest } from '@/features/cost/types/cost'
import PayerSelectModal from './PayerSelectModal'
import MemberSelectModal from './MemberSelectModal'
import { PlanService } from '@/features/plan/services/planServices'
import { CostPlusService } from '../services/costService'
import { ToastDock } from '@/components/blocks/ToastDock'
// import { DropdownSelect } from '@/components/blocks/DropdownSelect'
// import { COST_CATEGORIES, COST_CATEGORY_LABELS } from '@/features/cost/types/cost'

interface CostPlusFormProps {
  tripId: string
  onSuccess?: () => void
}
// const CATEGORY_OPTIONS = COST_CATEGORIES.map((cat) => ({
//   label: COST_CATEGORY_LABELS[cat],
//   value: cat,
// }))

const CostPlusForm = ({ tripId, onSuccess }: CostPlusFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuthStore()
  const [payer, setPayer] = useState<User | null>(user)
  const [isPayerModalOpen, setIsPayerModalOpen] = useState(false)
  const [members, setMembers] = useState<User[]>([])
  const [openMemberModalIndex, setOpenMemberModalIndex] = useState<number | null>(null)
  const [toast, setToast] = useState<{
    variant: 'success' | 'warning' | 'error'
    message: string
  } | null>(null)

  // 에러 상태 관리
  const [errors, setErrors] = useState<{
    payerId?: string
    place?: string
    totalAmount?: string
    memo?: string
    receiptJson?: string
    items?: string
  }>({})

  // 폼 데이터 상태
  const [formData, setFormData] = useState<CostPlusRequest>({
    payerId: user?.id || '',
    paidAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ':00',
    place: '',
    // category: 'ETC',
    totalAmount: 0,
    memo: '',
    receiptJson: null,
    items: [{ menuId: 0, menuName: '', amount: 0, memberIds: [], count: 1 }],
  })

  // 멤버 목록 로드
  const loadMembers = useCallback(async () => {
    try {
      const response = await PlanService.getTripMembers(Number(tripId))
      const membersList: User[] = response.members.map((member) => ({
        id: String(member.memberId),
        name: member.memberName,
        email: '',
        picture: member.thumbnailUrl,
      }))
      setMembers(membersList)
    } catch (error) {
      console.error('멤버 목록 불러오기 실패:', error)
      setMembers([])
    }
  }, [tripId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  // 결제자 선택 핸들러
  const handlePayerSelect = (selectedUser: User) => {
    setPayer(selectedUser)
    setFormData({ ...formData, payerId: selectedUser.id })
    // 에러 제거
    if (errors.payerId) {
      setErrors({ ...errors, payerId: undefined })
    }
  }

  // 결제 참여자 선택 핸들러
  const handleMemberSelect = (index: number, memberIds: string[]) => {
    updateItem(index, 'memberIds', memberIds)
    // 에러 제거
    if (errors.items && errors.items.includes(`품목 ${index + 1}: 결제 참여자`)) {
      setErrors({ ...errors, items: undefined })
    }
  }

  // memberId로 멤버 정보 가져오기
  const getMemberById = (memberId: string): User | undefined => {
    return members.find((m) => m.id === memberId)
  }

  // 품목 추가
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { menuId: 0, menuName: '', amount: 0, memberIds: [], count: 1 }],
    })
  }

  // 품목 삭제
  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      items: newItems,
    })
    // 품목이 남아있으면 에러 제거
    if (newItems.length > 0 && errors.items) {
      setErrors({ ...errors, items: undefined })
    }
  }

  // 품목 업데이트
  const updateItem = (index: number, field: keyof CostItem, value: string | number | string[]) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }

    // 수량은 참여자 수와 독립적으로 관리 (자동 변경 제거)
    // count는 실제 구매한 상품의 개수를 의미하며, 참여자 수와는 별개

    setFormData({ ...formData, items: newItems })

    // 품목 금액이 변경되면 items 에러 제거 (금액 합계 재검증을 위해)
    if (field === 'amount' && errors.items) {
      setErrors({ ...errors, items: undefined })
    }
  }

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, receiptJson: reader.result as string })
        // 에러 제거
        if (errors.receiptJson) {
          setErrors({ ...errors, receiptJson: undefined })
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    // 결제자 검증
    const payerIdStr = String(formData.payerId || '')
    if (!formData.payerId || payerIdStr.trim() === '') {
      newErrors.payerId = '결제자를 선택해주세요.'
    }

    // 결제 장소 검증
    if (!formData.place || formData.place.trim() === '') {
      newErrors.place = '결제 장소를 입력해주세요.'
    } else if (formData.place.length > 200) {
      newErrors.place = '결제 장소는 200자 이하로 입력해주세요.'
    }

    // 총 금액 검증
    if (!formData.totalAmount || formData.totalAmount <= 0) {
      newErrors.totalAmount = '총 금액을 입력해주세요.'
    }

    // 메모 검증
    if (!formData.memo || formData.memo.trim() === '') {
      newErrors.memo = '메모를 입력해주세요.'
    }

    // 증빙 자료 검증
    const receiptJsonStr = String(formData.receiptJson || '')
    if (!formData.receiptJson || receiptJsonStr.trim() === '') {
      newErrors.receiptJson = '증빙 자료를 업로드해주세요.'
    }

    // 품목 검증
    if (!formData.items || formData.items.length === 0) {
      newErrors.items = '최소 1개 이상의 품목을 추가해주세요.'
    } else {
      // 각 품목별 상세 검증
      const itemErrors: string[] = []

      formData.items.forEach((item, index) => {
        // 품목명 검증
        if (!item.menuName || item.menuName.trim() === '') {
          itemErrors.push(`품목 ${index + 1}: 품목명을 입력해주세요.`)
        }

        // 금액 검증
        if (item.amount < 0) {
          itemErrors.push(`품목 ${index + 1}: 음수값은 입력할 수 없습니다.`)
        } else if (!item.amount || item.amount < 1) {
          itemErrors.push(`품목 ${index + 1}: 금액은 1원 이상이어야 합니다.`)
        }

        // 결제 참여자 검증
        if (!item.memberIds || item.memberIds.length === 0) {
          itemErrors.push(`품목 ${index + 1}: 결제 참여자를 최소 1명 이상 선택해주세요.`)
        }
      })

      // 품목별 에러가 있으면 표시
      if (itemErrors.length > 0) {
        newErrors.items = itemErrors.join(' ')
      } else {
        // 품목별 금액 합계 계산
        const itemsTotal = formData.items.reduce(
          (sum, item) => sum + (item.amount || 0) * (item.count || 0),
          0
        )

        // 품목별 금액 합계가 총 금액과 일치하는지 검증
        if (itemsTotal !== formData.totalAmount) {
          newErrors.items = `품목별 금액 합계(${itemsTotal.toLocaleString()}원)가 총 금액(${formData.totalAmount.toLocaleString()}원)과 일치하지 않습니다.`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검사
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // memberIds를 string[]에서 number[]로 변환하여 API 요청 형식에 맞춤
      // 타입 단언 사용: 실제 API는 number[]를 받지만 타입 정의는 string[]로 되어 있음
      const submitData = {
        ...formData,
        items: formData.items.map((item) => ({
          ...item,
          memberIds: item.memberIds.map((id) => Number(id)), // string[] -> number[] 변환
        })),
      } as unknown as CostPlusRequest

      // API 호출: /cost/{tripId} POST 요청
      await CostPlusService.addCost(tripId, submitData)

      // console.log('비용 추가 성공')

      // 성공 시 콜백 호출 (모달 닫기 등)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('비용 추가 실패:', error)
      setToast({
        variant: 'error',
        message: '비용 추가에 실패했습니다. 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ToastDock
        open={Boolean(toast)}
        variant={toast?.variant ?? 'hint'}
        title="알림"
        message={toast?.message ?? ''}
        autoCloseMs={3000}
        offsetPx={16}
        onClose={() => setToast(null)}
      />
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* 결제자 선택 */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-base sm:text-lg mb-2 sm:mb-3 text-text-600 font-bmjua">
            결제자
          </label>
          <div
            className={`bg-white rounded-2xl p-3 sm:p-4 shadow-sm flex items-center space-x-3 ${
              errors.payerId ? 'ring-2 ring-red-400' : ''
            }`}
          >
            <div className="flex-shrink-0">
              {payer?.picture ? (
                <img
                  src={payer.picture}
                  alt={payer.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-400"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-blue-400">
                  <span className="text-white font-bold text-lg">
                    {payer?.name.charAt(0) || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-text-500">{payer?.name || '사용자'}</p>
            </div>
            <button
              type="button"
              className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors font-bold"
              onClick={() => setIsPayerModalOpen(true)}
            >
              변경
            </button>
          </div>
          {errors.payerId && (
            <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.payerId}</p>
          )}
        </div>

        {/* 결제 일시 */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-base sm:text-lg mb-2 sm:mb-3 text-text-600 font-bmjua">
            결제 일시
          </label>
          <input
            type="datetime-local"
            value={formData.paidAt.replace(' ', 'T').slice(0, 16)}
            onChange={(e) =>
              setFormData({ ...formData, paidAt: e.target.value.replace('T', ' ') + ':00' })
            }
            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02]"
          />
        </div>

        {/* 결제 장소 */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-base sm:text-lg mb-2 sm:mb-3 text-text-600 font-bmjua">
            결제 장소
          </label>
          <input
            type="text"
            value={formData.place}
            onChange={(e) => {
              setFormData({ ...formData, place: e.target.value })
              // 에러 제거
              if (errors.place) {
                setErrors({ ...errors, place: undefined })
              }
            }}
            placeholder="예: 스타벅스 강남점"
            className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] placeholder:text-gray-400 ${
              errors.place ? 'ring-2 ring-red-400' : ''
            }`}
          />
          {errors.place && <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.place}</p>}
        </div>

        {/* 총 금액 */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-base sm:text-lg mb-2 sm:mb-3 text-text-600 font-bmjua">
            총 금액
          </label>
          <input
            type="number"
            value={formData.totalAmount || ''}
            onChange={(e) => {
              setFormData({ ...formData, totalAmount: Number(e.target.value) })
              // 에러 제거
              if (errors.totalAmount) {
                setErrors({ ...errors, totalAmount: undefined })
              }
              // 총 금액이 변경되면 items 에러도 제거 (금액 합계 재검증을 위해)
              if (errors.items) {
                setErrors({ ...errors, items: undefined })
              }
            }}
            placeholder="0"
            className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] placeholder:text-gray-400 ${
              errors.totalAmount ? 'ring-2 ring-red-400' : ''
            }`}
          />
          {errors.totalAmount && (
            <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.totalAmount}</p>
          )}
        </div>

        {/* 메모 */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-base sm:text-lg mb-2 sm:mb-3 text-text-600 font-bmjua">
            메모 (선택사항)
          </label>
          <textarea
            value={formData.memo}
            onChange={(e) => {
              setFormData({ ...formData, memo: e.target.value })
              // 에러 제거
              if (errors.memo) {
                setErrors({ ...errors, memo: undefined })
              }
            }}
            placeholder="메모를 입력하세요"
            rows={3}
            className={`w-full px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base text-text-500 rounded-xl border-none outline-none focus:outline-none focus:ring-0 transition-all hover:shadow-md hover:scale-[1.02] resize-none placeholder:text-gray-400 ${
              errors.memo ? 'ring-2 ring-red-400' : ''
            }`}
          />
          {errors.memo && <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.memo}</p>}
        </div>

        {/* 증빙 자료 */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-base sm:text-lg mb-2 sm:mb-3 text-text-600 font-bmjua">
            증빙 자료 ( ex : 영수증, 기념 사진 )
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="receipt-upload"
          />
          <label
            htmlFor="receipt-upload"
            className={`flex items-center justify-center w-full px-4 py-3 bg-white border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              errors.receiptJson
                ? 'border-red-400 hover:border-red-500'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <svg
              className="w-6 h-6 text-gray-400 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="text-sm text-gray-600">이미지 업로드</span>
          </label>
          {formData.receiptJson && (
            <div className="relative">
              <img
                src={formData.receiptJson}
                alt="영수증"
                className="w-full h-32 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, receiptJson: null })
                  // 에러 제거
                  if (errors.receiptJson) {
                    setErrors({ ...errors, receiptJson: undefined })
                  }
                }}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
        {errors.receiptJson && (
          <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.receiptJson}</p>
        )}

        {/* 품목 */}
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between items-center mb-2 sm:mb-3">
            <label className="block text-base sm:text-lg text-text-600 font-bmjua">결제 품목</label>
            <button
              type="button"
              onClick={() => {
                addItem()
                // 에러 제거
                if (errors.items) {
                  setErrors({ ...errors, items: undefined })
                }
              }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-bold"
            >
              + 추가
            </button>
          </div>
          {errors.items && <p className="mb-2 text-sm text-red-500 font-bmjua">{errors.items}</p>}
          {formData.items.map((item, index) => (
            <div key={index} className="p-3 bg-white rounded-xl border border-gray-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-600">품목 {index + 1}</span>
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    삭제
                  </button>
                )}
              </div>
              <label className="text-xs text-text-500 mb-1 block">품목명</label>
              <input
                type="text"
                value={item.menuName}
                onChange={(e) => {
                  updateItem(index, 'menuName', e.target.value)
                  // 에러 제거
                  if (errors.items && errors.items.includes(`품목 ${index + 1}: 품목명`)) {
                    setErrors({ ...errors, items: undefined })
                  }
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-blue-300 rounded-lg text-sm outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
              />
              <label className="text-xs text-text-500 mb-1 block">금액</label>
              <input
                type="number"
                min="0"
                value={item.amount || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value)
                  // 음수값 방지
                  if (value >= 0) {
                    updateItem(index, 'amount', value)
                    // 에러 제거
                    if (errors.items && errors.items.includes(`품목 ${index + 1}: 금액`)) {
                      setErrors({ ...errors, items: undefined })
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-blue-300 rounded-lg text-sm outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
              />
              <label className="text-xs text-text-500 mb-1 block">수량</label>
              <input
                type="number"
                min="0"
                value={item.count || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value)
                  // 음수값 방지
                  if (value >= 0) {
                    updateItem(index, 'count', value)
                    // 에러 제거
                    if (errors.items && errors.items.includes(`품목 ${index + 1}: 수량`)) {
                      setErrors({ ...errors, items: undefined })
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-blue-300 rounded-lg text-sm outline-none focus:outline-none focus:ring-0 focus:border-blue-400"
              />
              <div>
                <label className="text-xs text-text-500 mb-1 block">결제 참여자</label>
                {/* 선택된 멤버 표시 */}
                {item.memberIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {item.memberIds.map((memberId) => {
                      const member = getMemberById(memberId)
                      if (!member) return null
                      return (
                        <div
                          key={memberId}
                          className="flex items-center space-x-2 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          {member.picture ? (
                            <img
                              src={member.picture}
                              alt={member.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                {member.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-xs font-bold text-text-500">{member.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const newMemberIds = item.memberIds.filter((id) => id !== memberId)
                              updateItem(index, 'memberIds', newMemberIds)
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {/* 멤버 선택 버튼 */}
                <button
                  type="button"
                  onClick={() => setOpenMemberModalIndex(index)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm text-left flex items-center justify-between"
                >
                  <span className="text-text-500">
                    {item.memberIds.length > 0
                      ? `${item.memberIds.length}명 선택됨`
                      : '결제 참여자 선택'}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-center mt-6 sm:mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full sm:w-auto bg-gradient-to-br from-hover-600 to-point-600 text-white text-base sm:text-lg px-8 sm:px-12 py-2.5 sm:py-3 rounded-full shadow-lg hover:scale-105 hover:from-point-600 hover:to-main-800 transition-all font-bold font-bmjua ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? '추가 중...' : '추가하기'}
          </button>
        </div>

        {/* 결제자 선택 모달 */}
        <PayerSelectModal
          isOpen={isPayerModalOpen}
          onClose={() => setIsPayerModalOpen(false)}
          tripId={tripId}
          onSelect={handlePayerSelect}
        />

        {/* 결제 참여자 선택 모달 */}
        {openMemberModalIndex !== null && (
          <MemberSelectModal
            isOpen={openMemberModalIndex !== null}
            onClose={() => setOpenMemberModalIndex(null)}
            tripId={tripId}
            selectedMemberIds={formData.items[openMemberModalIndex]?.memberIds || []}
            onSelect={(memberIds) => {
              handleMemberSelect(openMemberModalIndex, memberIds)
              setOpenMemberModalIndex(null)
            }}
          />
        )}
      </form>
    </>
  )
}

export default CostPlusForm
