import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { User } from '@/features/auth/types/auth'
import { CostItem, CostRequest } from '@/features/cost/types/cost'
import PayerSelectModal from './PayerSelectModal'
import MemberSelectModal from './MemberSelectModal'
import { PlanService } from '@/features/plan/services/planServices'

interface CostPlusFormProps {
  tripId: string
}

const CostPlusForm = ({ tripId }: CostPlusFormProps) => {
  const { user } = useAuthStore()
  const [payer, setPayer] = useState<User | null>(user)
  const [isPayerModalOpen, setIsPayerModalOpen] = useState(false)
  const [members, setMembers] = useState<User[]>([])
  const [openMemberModalIndex, setOpenMemberModalIndex] = useState<number | null>(null)
  
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
  const [formData, setFormData] = useState<CostRequest>({
    payerId: user?.id || '',
    paidAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ':00',
    place: '',
    totalAmount: 0,
    memo: '',
    receiptJson: null,
    items: [{ menuName: '', amount: 0, memberIds: [], count: 1 }],
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
  }

  // memberId로 멤버 정보 가져오기
  const getMemberById = (memberId: string): User | undefined => {
    return members.find((m) => m.id === memberId)
  }

  // 품목 추가
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { menuName: '', amount: 0, memberIds: [], count: 1 }],
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

    if (field === 'memberIds' && Array.isArray(value)) {
      newItems[index].count = value.length
    }

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
      // 품목별 금액 합계 계산
      const itemsTotal = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0)
      
      // 품목별 금액 합계가 총 금액과 일치하는지 검증
      if (itemsTotal !== formData.totalAmount) {
        newErrors.items = `품목별 금액 합계(${itemsTotal.toLocaleString()}원)가 총 금액(${formData.totalAmount.toLocaleString()}원)과 일치하지 않습니다.`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!validateForm()) {
      return
    }
    
    // memberIds를 string[]에서 number[]로 변환하여 API 요청 형식에 맞춤
    const submitData = {
      ...formData,
      items: formData.items.map((item) => ({
        ...item,
        memberIds: item.memberIds.map((id) => Number(id)), // string[] -> number[] 변환
      })),
    }
    
    console.log('제출된 데이터:', submitData)
    // TODO: API 호출 시 submitData 사용
    // memberIds는 number[] 형식으로 전송됨: "memberIds": [1, 2]
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 결제자 선택 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">결제자</label>
        <div
          className={`flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border-2 ${
            errors.payerId ? 'border-red-400' : 'border-gray-200'
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
                <span className="text-white font-bold text-lg">{payer?.name.charAt(0) || 'U'}</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-text-500">{payer?.name || '사용자'}</p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors font-bold"
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
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">결제 일시</label>
        <input
          type="datetime-local"
          value={formData.paidAt.replace(' ', 'T').slice(0, 16)}
          onChange={(e) =>
            setFormData({ ...formData, paidAt: e.target.value.replace('T', ' ') + ':00' })
          }
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
        />
      </div>

      {/* 결제 장소 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">결제 장소</label>
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
          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none transition-colors placeholder:text-gray-400 ${
            errors.place
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-200 focus:border-blue-400'
          }`}
        />
        {errors.place && (
          <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.place}</p>
        )}
      </div>

      {/* 총 금액 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">총 금액</label>
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
          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none transition-colors placeholder:text-gray-400 ${
            errors.totalAmount
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-200 focus:border-blue-400'
          }`}
        />
        {errors.totalAmount && (
          <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.totalAmount}</p>
        )}
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">메모</label>
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
          className={`w-full px-4 py-2.5 border-2 rounded-xl focus:outline-none transition-colors resize-none placeholder:text-gray-400 ${
            errors.memo
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-200 focus:border-blue-400'
          }`}
        />
        {errors.memo && (
          <p className="mt-1 text-sm text-red-500 font-bmjua">{errors.memo}</p>
        )}
      </div>

      {/* 증빙 자료 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">
          증빙 자료 ( ex : 영수증, 기념 사진 )
        </label>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="receipt-upload"
          />
          <label
            htmlFor="receipt-upload"
            className={`flex items-center justify-center w-full px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
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
      </div>

      {/* 품목 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-bold text-text-500 font-bmjua">결제 품목</label>
          <button
            type="button"
            onClick={() => {
              addItem()
              // 에러 제거
              if (errors.items) {
                setErrors({ ...errors, items: undefined })
              }
            }}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-bold"
          >
            + 추가
          </button>
        </div>
        {errors.items && (
          <p className="mb-2 text-sm text-red-500 font-bmjua">{errors.items}</p>
        )}
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div
              key={index}
              className="p-3 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-2"
            >
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
                onChange={(e) => updateItem(index, 'menuName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
              />
              <label className="text-xs text-text-500 mb-1 block">금액</label>
              <input
                type="number"
                value={item.amount || ''}
                onChange={(e) => updateItem(index, 'amount', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
              />
              <div>
                <label className="text-xs text-text-500 mb-1 block">
                  결제 참여자 (총 {item.memberIds.length}명)
                </label>
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
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        className="w-full bg-gradient-to-br from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:shadow-lg transition-all font-bold font-bmjua"
      >
        추가하기
      </button>

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
  )
}

export default CostPlusForm
