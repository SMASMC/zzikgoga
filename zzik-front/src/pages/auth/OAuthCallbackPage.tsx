// src/pages/auth/OAuthCallbackPage.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KakaoOAuthService } from '../../features/auth/services/kakaoOAuth';
import { useAuthStore } from '../../shared/stores/useAuthStore';
import { isJWTExpired } from '../../shared/utils/jwt';

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // 1. 에러 파라미터 검사
        const error = KakaoOAuthService.getErrorFromUrl();
        if (error) {
          console.error('OAuth 에러:', error);
          navigate('/login?error=oauth_failed', { replace: true });
          return;
        }

        // 2. 토큰 URL 파싱 (hash or query)
        const urlParams = new URLSearchParams(window.location.search);
        const signupToken = urlParams.get('token');

        if (signupToken) {
          if (isJWTExpired(signupToken)) {
            navigate('/login?error=token_expired', { replace: true });
            return;
          }
          navigate(`/signup?token=${encodeURIComponent(signupToken)}`, { replace: true });
          return;
        }

        const accessToken =
          KakaoOAuthService.getAccessTokenFromUrl() ||
          new URLSearchParams(window.location.hash.replace(/^#/, '')).get('access_token');

        // 3. 토큰이 있을 때
        if (accessToken) {
          // TODO: 백엔드 API로 토큰을 보내고 user 정보를 받아와야 함
          // 예시: const userInfo = await fetchUserInfo(accessToken)
          // setAuth(userInfo, accessToken)
          
          // 임시: 기본 user 정보로 설정 (API 연동 전)
          setAuth(
            {
              id: 'temp-id',
              email: 'kakao-user@example.com',
              name: '카카오 사용자',
            },
            accessToken
          );
          navigate('/', { replace: true });
          return;
        }

        // 4️. 토큰이 없을 때
        navigate('/login?error=no_token', { replace: true });
      } catch (err) {
        console.error('OAuth 콜백 처리 중 오류:', err);
        navigate('/login?error=oauth_callback_error', { replace: true });
      }
    };

    handleOAuthCallback();
  }, [navigate, setAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg">카카오 로그인 처리 중...</div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-yellow-400"></div>
      </div>
    </div>
  );
}
