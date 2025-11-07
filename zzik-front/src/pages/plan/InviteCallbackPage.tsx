import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { PlanService } from '@/features/plan/services/planServices'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import LoginModal from '@/features/auth/components/LoginModal'

export function InviteCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const token = searchParams.get('token')
  const [error, setError] = useState<string>('')
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const acceptInvite = async () => {
      if (!token) {
        setError('토큰이 없습니다')
        return
      }

      // 로그인 확인
      if (!isAuthenticated) {
        // 로그인 후 돌아올 URL 저장
        sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search)
        setIsLoginModalOpen(true)
        return
      }

      // 로그인 상태이지만 모달이 열려있으면 닫기
      setIsLoginModalOpen(false)

      // 이미 처리 완료했으면 중복 실행 방지
      if (isProcessing) {
        return
      }

      setIsProcessing(true)
      setError('') // 이전 에러 초기화

      try {
        const response = await PlanService.acceptInvite(token)

        // 초대 수락 성공 여부 확인
        if (!response.joined) {
          setError('초대 수락에 실패했습니다. 이미 참여중이거나 유효하지 않은 초대입니다.')
          setIsProcessing(false)
          return
        }

        // 성공 시 해당 여행 페이지로 리다이렉트
        if (response.tripId) {
          setTimeout(() => {
            navigate(`/plan/${response.tripId}`)
          }, 1000)
        } else {
          console.error('tripId가 없습니다:', response)
          setError('여행 정보를 찾을 수 없습니다.')
          setIsProcessing(false)
        }
      } catch (error) {
        console.error('초대 수락 실패:', error)
        const errorMessage = error instanceof Error ? error.message : '초대 수락에 실패했습니다'

        // 로그인 필요 에러인 경우
        if (errorMessage.includes('로그인') || errorMessage.includes('인증')) {
          sessionStorage.setItem('redirectAfterLogin', location.pathname + location.search)
          setIsLoginModalOpen(true)
        } else {
          setError(errorMessage)
        }
        setIsProcessing(false)
      }
    }

    acceptInvite()
  }, [token, isAuthenticated]) // isAuthenticated가 변경되면 재시도

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md">
        {error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-500"
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
            </div>
            <h1 className="text-2xl font-bold text-text-500 font-bmjua mb-4">초대 수락 실패</h1>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-bold"
            >
              홈으로 가기
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg
                className="w-8 h-8 text-blue-500"
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
            </div>
            <h1 className="text-2xl font-bold text-text-500 font-bmjua mb-4">초대 처리 중...</h1>
            <p className="text-gray-600">
              {isLoginModalOpen ? '로그인 후 초대를 수락하세요' : '잠시만 기다려주세요'}
            </p>
          </>
        )}
      </div>

      {/* 로그인 모달 */}
      {isLoginModalOpen && <LoginModal onClose={() => setIsLoginModalOpen(false)} />}
    </div>
  )
}
