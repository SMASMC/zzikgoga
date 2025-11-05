import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/features/auth/types/auth'
import { deleteCookie } from '@/shared/utils/cookie'
import { AuthService } from '@/features/auth/services/authService'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),
      logout: async () => {
        try {
          // 백엔드에 로그아웃 요청 (httpOnly 쿠키 삭제)
          await AuthService.logout()
        } catch (error) {
          console.error('로그아웃 API 호출 실패:', error)
          // API 실패해도 프론트엔드 상태는 초기화
        }

        // 일반 쿠키도 삭제 시도
        deleteCookie('accessToken')

        // 상태 초기화
        set({
          user: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
