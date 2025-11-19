// src/pages/auth/OAuthCallbackPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../../shared/stores/useAuthStore'
import { OAuthCallbackResponse } from '@/features/auth/types/auth'
import { apiClient } from '@/shared/api/client'

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        if (!code) {
          navigate('/?error=no_code', { replace: true })
          return
        }
        console.log('카카오 인가 코드:', code)

        // 1. 카카오에서 idToken 받기
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
          navigate('/?error=no_id_token', { replace: true })
          return
        }

        console.log('idToken 획득 성공', idToken)

        // 2. 백엔드로 idToken 전달
        const data = await apiClient.post<OAuthCallbackResponse>('/auth/kakao', {
          idToken: idToken,
        })

        console.log('OAuth Callback Response:', data)

        // 3. 로그인 완료
        if (data.loggedIn && data.user) {
          setAuth(data.user)
          sessionStorage.setItem('toastAfterLogin', '로그인이 완료되었습니다!')

          // 초대 링크에서 왔는지 확인
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin')
          if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin')
            await new Promise((resolve) => setTimeout(resolve, 100))
            navigate(redirectUrl, { replace: true })
          } else {
            navigate('/mypage', { replace: true })
          }
          return
        }

        // 4. 신규 회원 (회원가입 페이지 이동)
        if ('signupRequired' in data && data.signupRequired) {
          // sessionStorage에서 초대 링크 정보 확인하여 state에 포함
          const redirectUrl = sessionStorage.getItem('redirectAfterLogin')
          console.log('[OAuthCallback] 신규 회원 - redirectUrl:', redirectUrl)

          navigate(`/auth/signup`, {
            replace: true,
            state: {
              ...data,
              redirectUrl: redirectUrl, // sessionStorage 값을 state에 포함
            },
          })
          return
        }

        console.error('알 수 없는 응답 형식:', data)
        navigate('/?error=unknown', { replace: true })
      } catch (err) {
        console.error('OAuth 콜백 처리 중 오류:', err)
        navigate('/?error=oauth_callback_error', { replace: true })
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
