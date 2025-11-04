import { apiClient } from '@/shared/api/client'
import { SignupRequest, SignupResponse } from '../types/auth'

/**
 * 회원가입 서비스
 */
export class AuthService {
  /**
   * 회원가입 요청
   * @param data SignupRequest 데이터
   * @returns 회원가입 성공 시 사용자 정보 및 토큰
   */
  public static async register(data: SignupRequest): Promise<SignupResponse> {
    // TODO: 백엔드 팀에게 회원가입 엔드포인트 URL 확인 필요
    // 예상 엔드포인트: /auth/register 또는 /auth/signup
    const response = await apiClient.post<SignupResponse>('/auth/signup', data)
    return response
  }
}
