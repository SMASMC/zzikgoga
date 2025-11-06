import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/useAuthStore'
import LoginModal from '@/features/auth/components/LoginModal'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 로그인한 사용자만 접근 가능한 페이지를 보호하는 컴포넌트
 * 비로그인 시 로그인 모달을 띄우고, 모달 닫으면 홈페이지로 리다이렉트
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const user = useAuthStore((state) => state.user)
  const [shouldRedirect, setShouldRedirect] = useState(false)

  // 로그인 모달 닫기 핸들러 (x 버튼 클릭 시 홈으로)
  const handleCloseModal = () => {
    setShouldRedirect(true)
  }

  // x 버튼으로 모달 닫은 후 홈으로 리다이렉트
  if (shouldRedirect) {
    return <Navigate to="/" replace />
  }

  // 로그인 안 되어 있으면 모달 표시
  if (!user) {
    return <LoginModal onClose={handleCloseModal} />
  }

  // 로그인 되어 있으면 페이지 렌더링
  return <>{children}</>
}
