import { useState } from 'react'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import { User } from '@/features/auth/types/auth'
import { CostItem, CostRequest } from '@/features/cost/types/cost'

const CostPlusForm = () => {
  const { user } = useAuthStore()
  const [payer] = useState<User | null>(user)
  
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

  // 품목 추가
  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { menuName: '', amount: 0, memberIds: [], count: 1 }],
    })
  }

  // 품목 삭제
  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  // 품목 업데이트
  const updateItem = (index: number, field: keyof CostItem, value: string | number | string[]) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // memberIds가 업데이트되면 count도 자동으로 계산
    if (field === 'memberIds' && Array.isArray(value)) {
      newItems[index].count = value.length
    }
    
    setFormData({ ...formData, items: newItems })
  }

  // 이미지 업로드 핸들러
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, receiptJson: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('제출된 데이터:', formData)
    // TODO: API 호출
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 결제자 선택 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">
          결제자
        </label>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
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
            <p className="text-xs text-text-600">{payer?.email || ''}</p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors font-bold"
            onClick={() => console.log('결제자 변경')}
          >
            변경
          </button>
        </div>
      </div>

      {/* 결제 일시 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">
          결제 일시
        </label>
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
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">
          결제 장소
        </label>
        <input
          type="text"
          value={formData.place}
          onChange={(e) => setFormData({ ...formData, place: e.target.value })}
          placeholder="예: 스타벅스 강남점"
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
        />
      </div>

      {/* 총 금액 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">
          총 금액
        </label>
        <input
          type="number"
          value={formData.totalAmount || ''}
          onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
          placeholder="0"
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors"
        />
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">
          메모
        </label>
        <textarea
          value={formData.memo}
          onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          placeholder="메모를 입력하세요"
          rows={3}
          className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:outline-none transition-colors resize-none"
        />
      </div>

      {/* 증빙 자료 */}
      <div>
        <label className="block text-sm font-bold text-text-500 mb-2 font-bmjua">
          증빙 자료
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
            className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 cursor-pointer transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
                onClick={() => setFormData({ ...formData, receiptJson: null })}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 품목 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-bold text-text-500 font-bmjua">품목</label>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-bold"
          >
            + 추가
          </button>
        </div>
        <div className="space-y-3">
          {formData.items.map((item, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-2">
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
              <input
                type="text"
                value={item.menuName}
                onChange={(e) => updateItem(index, 'menuName', e.target.value)}
                placeholder="메뉴 이름"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
              />
              <input
                type="number"
                value={item.amount || ''}
                onChange={(e) => updateItem(index, 'amount', Number(e.target.value))}
                placeholder="금액"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
              />
              <div>
                <label className="text-xs text-gray-600 mb-1 block">
                  결제 참여자 (총 {item.count}명)
                </label>
                <input
                  type="text"
                  value={item.memberIds.join(', ')}
                  onChange={(e) =>
                    updateItem(
                      index,
                      'memberIds',
                      e.target.value.split(',').map((id) => id.trim()).filter(Boolean)
                    )
                  }
                  placeholder="예: user1, user2, user3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-sm"
                />
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
    </form>
  )
}

export default CostPlusForm
