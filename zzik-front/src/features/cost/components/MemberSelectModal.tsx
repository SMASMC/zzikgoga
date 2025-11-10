import { useEffect, useState, useCallback } from 'react'
import { User } from '@/features/auth/types/auth'
import { PlanService } from '@/features/plan/services/planServices'

interface MemberSelectModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  selectedMemberIds: string[]
  onSelect: (memberIds: string[]) => void
}

const MemberSelectModal = ({
  isOpen,
  onClose,
  tripId,
  selectedMemberIds,
  onSelect,
}: MemberSelectModalProps) => {
  const [members, setMembers] = useState<User[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(selectedMemberIds))
  const [isLoading, setIsLoading] = useState(false)

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await PlanService.getTripMembers(Number(tripId))

      // Members 타입을 User 타입으로 변환
      const membersList: User[] = response.members.map((member) => ({
        id: String(member.memberId),
        name: member.memberName,
        email: '', // API에서 이메일 정보가 없음
        picture: member.thumbnailUrl,
      }))

      setMembers(membersList)
    } catch (error) {
      console.error('멤버 목록 불러오기 실패:', error)
      setMembers([])
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    if (isOpen) {
      loadMembers()
      setSelectedIds(new Set(selectedMemberIds))
    }
  }, [isOpen, loadMembers, selectedMemberIds])

  const handleToggle = (memberId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId)
    } else {
      newSelected.add(memberId)
    }
    setSelectedIds(newSelected)
  }

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds))
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-500 font-bmjua">결제 참여자 선택</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body - 멤버 목록 */}
        <div className="space-y-3 mb-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">멤버가 없습니다</div>
          ) : (
            members.map((member) => (
              <label
                key={member.id}
                className={`flex items-center space-x-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedIds.has(member.id)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(member.id)}
                  onChange={() => handleToggle(member.id)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-shrink-0">
                  {member.picture ? (
                    <img
                      src={member.picture}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-bold">{member.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-500">{member.name}</p>
                  {member.email && <p className="text-xs text-text-600">{member.email}</p>}
                </div>
              </label>
            ))
          )}
        </div>

        {/* 확인 버튼 */}
        <button
          onClick={handleConfirm}
          className="w-full bg-gradient-to-br from-blue-500 to-blue-600 text-white py-3 rounded-xl hover:shadow-lg transition-all font-bold font-bmjua"
        >
          확인 ({selectedIds.size}명 선택됨)
        </button>
      </div>
    </div>
  )
}

export default MemberSelectModal

