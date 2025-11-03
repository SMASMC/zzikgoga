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
        console.log(import.meta.env.VITE_KAKAO_REST_API_KEY)
        console.log(import.meta.env.VITE_KAKAO_REDIRECT_URI)
        console.log('카카오 code:', code)

        // 1. 인가 코드로 id_token 받기
        const tokenResponse = await axios.post(
          'https://kauth.kakao.com/oauth/token',
          new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: import.meta.env.VITE_KAKAO_REST_API_KEY,
            redirect_uri: import.meta.env.VITE_KAKAO_REDIRECT_URI,
            code: code,
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

        const idToken = tokenResponse.data.id_token
        if (!idToken) {
          navigate('/auth?error=no_id_token', { replace: true })
          return
        }

        // 2. 백엔드로 idToken 전달 → JWT 발급 or signupToken 반환
        console.log(idToken)
        console.log(import.meta.env.VITE_API_BASE_URL)
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/kakao`,
          { idToken },
          { withCredentials: true }
        )

        console.log(data)

        // 3. 로그인 완료
        if (data.accessToken) {
          setAuth(data.user, data.accessToken)
          navigate('/', { replace: true })
          return
        }

        // 4. 신규 회원 (회원가입 페이지 이동)
        else if (data.signupRequired) {
          navigate(`/signup?token=${encodeURIComponent(data.signupSessionToken)}`, {
            replace: true,
          })
          return
        }

        navigate('/auth?error=unknown', { replace: true })
      } catch (err) {
        console.error('OAuth 콜백 처리 중 오류:', err)
        navigate('/auth?error=oauth_callback_error', { replace: true })
      }
    }

    handleOAuthCallback()
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg">카카오 로그인 처리 중...</div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-400"></div>
      </div>
    </div>
  )
}
