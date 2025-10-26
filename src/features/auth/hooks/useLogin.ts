import { useState } from 'react'
import { useAuthStore } from '@shared/stores/useAuthStore'
import { authService } from '../services/authService'
import { LoginRequest } from '../types/auth'

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAuthStore((state) => state.setAuth)

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authService.login(credentials)
      setAuth(response.user, response.token)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '로그인에 실패했습니다.'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    login,
    isLoading,
    error,
  }
}
