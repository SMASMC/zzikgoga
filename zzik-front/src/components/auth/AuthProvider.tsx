import { useEffect, useState } from 'react'
import { useAuthStore } from '@/shared/stores/useAuthStore'

interface AuthProviderProps {
  children: React.ReactNode
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // zustand persist가 localStorage에서 인증 상태를 자동으로 복원함
    // 별도의 API 호출 없이 저장된 상태만 확인
    setIsLoading(false)
  }, [])

  // 인증 상태 확인을 위한 로그 (개발용)
  useEffect(() => {
    if (!isLoading) {
      // console.log('현재 인증 상태:', isAuthenticated)
    }
  }, [isAuthenticated, isLoading])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">로딩 중...</div>
      </div>
    )
  }

  return <>{children}</>
}

export default AuthProvider
