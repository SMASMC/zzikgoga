// src/pages/auth/OAuthCallbackPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../../shared/stores/useAuthStore'

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        if (!code) {
          navigate('/auth?error=no_code', { replace: true })
          return
        }

        // 1. 인가 코드로 id_token 받기
        const tokenResponse = await axios.post(
          'https://kauth.kakao.com/oauth/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
            redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
            code,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

        const idToken = tokenResponse.data.id_token
        if (!idToken) {
          navigate('/auth?error=no_id_token', { replace: true })
          return
        }

        // 2. 백엔드로 idToken 전달 → JWT 발급 or signupToken 반환
        const { data } = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/auth/callback`,
          { idToken },
          { withCredentials: true }
        )

        // 3. 로그인 완료
        if (data.accessToken) {
          setAuth(data.user, data.accessToken)
          navigate('/', { replace: true })
          return
        }

        // 4. 신규 회원 (회원가입 페이지 이동)
        if (data.signupToken) {
          navigate(`/signup?token=${encodeURIComponent(data.signupToken)}`, { replace: true })
          return
        }

        navigate('/auth?error=unknown', { replace: true })
      } catch (err) {
        console.error('OAuth 콜백 처리 중 오류:', err)
        navigate('/auth?error=oauth_callback_error', { replace: true })
      }
    }

    handleOAuthCallback()
  }, [navigate, setAuth])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg">카카오 로그인 처리 중...</div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-400"></div>
      </div>
    </div>
  )
}
