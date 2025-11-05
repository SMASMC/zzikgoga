package com.zzik.backend.domain.auth.dto.response;

/**
 * 서비스 계층 -> 컨트롤러
 * 카카오 로그인 결과 (성공 또는 가입 필요)를 나타내는 Sealed Interface
 */
public sealed interface KakaoLoginResult permits AuthResult, SignupData {
}
