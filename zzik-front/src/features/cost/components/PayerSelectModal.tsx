import { useEffect, useState, useCallback } from 'react'
import { User } from '@/features/auth/types/auth'
import { PlanService } from '@/features/plan/services/planServices'

interface PayerSelectModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  onSelect: (user: User) => void
}

const PayerSelectModal = ({ isOpen, onClose, tripId, onSelect }: PayerSelectModalProps) => {
  const [members, setMembers] = useState<User[]>([])
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
    }
  }, [isOpen, loadMembers])

  const handleSelect = (member: User) => {
    onSelect(member)
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
          <h2 className="text-xl font-bold text-text-500 font-bmjua">결제자 선택</h2>
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
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">멤버가 없습니다</div>
          ) : (
            members.map((member) => (
              <button
                key={member.id}
                onClick={() => handleSelect(member)}
                className="w-full flex items-center space-x-3 p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer text-left"
              >
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
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default PayerSelectModal

