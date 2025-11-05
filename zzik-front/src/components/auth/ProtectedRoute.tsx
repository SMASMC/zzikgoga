import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/shared/stores/useAuthStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 로그인한 사용자만 접근 가능한 페이지를 보호하는 컴포넌트
 * 비로그인 시 홈페이지로 리다이렉트
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const user = useAuthStore((state) => state.user)

  // 로그인 안 되어 있으면 홈페이지로
  if (!user) {
    return <Navigate to="/" replace />
  }

  // 로그인 되어 있으면 페이지 렌더링
  return <>{children}</>
}
