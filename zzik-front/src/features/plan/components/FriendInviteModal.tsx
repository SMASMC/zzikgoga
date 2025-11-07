import { useEffect, useState, useCallback } from 'react'
import { User } from '@/features/auth/types/auth'
import { PlanService } from '../services/planServices'

interface FriendInviteModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  onInvite: (friendIds: string[]) => void
}

const FriendInviteModal = ({ isOpen, onClose, tripId, onInvite }: FriendInviteModalProps) => {
  const [friends, setFriends] = useState<User[]>([])
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)

  const loadFriends = useCallback(async () => {
    setIsLoading(true)
    try {
      // 지금 여기 API 호출이 안됨(왜냐하면 아직 백 코드가 없기 때문)
      const response = await PlanService.getTripMembers(Number(tripId))
      console.log('멤버 목록:', response)
      
      // Members 타입을 User 타입으로 변환
      const friendsList: User[] = response.members.map((member) => ({
        id: String(member.memberId),
        name: member.memberName,
        email: '', // API에서 이메일 정보가 없음
        picture: member.thumbnailUrl,
      }))
      
      setFriends(friendsList)
    } catch (error) {
      console.error('친구 목록 불러오기 실패:', error)
      setFriends([])
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  const loadInviteUrl = useCallback(async () => {
    try {
      const response = await PlanService.inviteFriend(Number(tripId))
      console.log('초대 URL 생성 성공:', response.inviteurl)
      setInviteUrl(response.inviteurl)
    } catch (error) {
      console.error('초대 URL 생성 실패:', error)
      console.error('에러 상세:', error instanceof Error ? error.message : error)
      // 에러가 발생해도 모달은 계속 표시하되, URL 없이 표시
      setInviteUrl('')
    }
  }, [tripId])

  useEffect(() => {
    if (isOpen) {
      loadFriends()
      loadInviteUrl()
    } else {
      // 모달이 닫힐 때 선택 상태 초기화
      setSelectedFriends(new Set())
      setIsCopied(false)
    }
  }, [isOpen, loadFriends, loadInviteUrl])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('클립보드 복사 실패:', error)
    }
  }



  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriends)
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId)
    } else {
      newSelected.add(friendId)
    }
    setSelectedFriends(newSelected)
  }

  const handleInvite = () => {
    onInvite(Array.from(selectedFriends))
    setSelectedFriends(new Set())
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-500 font-bmjua">친구 초대하기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
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

        {/* Body - 친구 목록 */}
        <div className="space-y-3 mb-4">
          <h3 className="text-sm font-bold text-text-500">친구 목록</h3>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8 text-gray-500">친구가 없습니다</div>
          ) : (
            friends.map((friend) => (
              <label
                key={friend.id}
                className={`flex items-center space-x-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedFriends.has(friend.id)
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedFriends.has(friend.id)}
                  onChange={() => toggleFriend(friend.id)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex-shrink-0">
                  {friend.picture ? (
                    <img
                      src={friend.picture}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-white font-bold">
                        {friend.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-text-500">{friend.name}</p>
                  <p className="text-xs text-text-600">{friend.email}</p>
                </div>
              </label>
            ))
          )}
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* 초대 링크 */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-text-500">초대 링크로 공유하기</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteUrl}
              readOnly
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 focus:outline-none"
              placeholder={inviteUrl === '' && !isLoading ? '링크 생성 실패' : '초대 링크 생성 중...'}
            />
            <button
              onClick={copyToClipboard}
              disabled={!inviteUrl}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                isCopied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
              }`}
            >
              {isCopied ? '✓ 복사됨' : '복사'}
            </button>
          </div>
          {inviteUrl ? (
            <p className="text-xs text-gray-500">이 링크를 공유하여 친구를 초대하세요</p>
          ) : (
            <div className="flex items-start gap-1 text-xs text-red-600">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>초대 링크 생성에 실패했습니다. 페이지를 새로고침하거나 권한을 확인해주세요.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-bold"
          >
            취소
          </button>
          <button
            onClick={handleInvite}
            disabled={selectedFriends.size === 0}
            className="flex-1 py-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            초대하기 ({selectedFriends.size})
          </button>
        </div>
      </div>
    </div>
  )
}

export default FriendInviteModal

