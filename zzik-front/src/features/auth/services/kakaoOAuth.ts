/**
 * 카카오 OAuth 서비스
 * 백엔드 서버로 리다이렉트하여 OAuth 인증 처리
 */
export class KakaoOAuthService {
  private static readonly BACK_URL = import.meta.env.VITE_KAKAO_BACK_URL

  /**
   * 카카오 로그인
   * 백엔드 OAuth 엔드포인트로 리다이렉트
   */
  public static login(): void {
    const authUrl = `${this.BACK_URL}`
    window.location.href = authUrl
  }

  /**
   * URL에서 error 파라미터 추출
   * OAuthCallbackPage에서 사용
   */
  public static getErrorFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search)
    return params.get('error')
  }

  /**
   * URL에서 access_token 추출 (hash 형식)
   * OAuthCallbackPage에서 사용
   */
  public static getAccessTokenFromUrl(): string | null {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    return hashParams.get('access_token')
  }
}
