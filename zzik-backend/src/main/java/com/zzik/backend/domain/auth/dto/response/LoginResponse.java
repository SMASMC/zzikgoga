package com.zzik.backend.domain.auth.dto.response;

/**
 * 컨트롤러 -> 클라이언트
 * 카카오 로그인 API의 최종 응답 (성공 또는 가입 필요)을 나타내는 Sealed Interface
 */
public sealed interface LoginResponse permits AuthSuccessResponse, SignupRequiredResponse {
}
