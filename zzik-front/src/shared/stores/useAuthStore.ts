import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/features/auth/types/auth'
import { deleteCookie } from '@/shared/utils/cookie'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setAuth: (user: User) => void
  logout: () => void
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
      logout: () => {
        // 쿠키에서 accessToken 삭제
        deleteCookie('accessToken')
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
