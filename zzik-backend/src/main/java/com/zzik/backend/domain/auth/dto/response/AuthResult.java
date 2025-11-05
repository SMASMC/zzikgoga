package com.zzik.backend.domain.auth.dto.response;

/**
 * 서비스 계층 -> 컨트롤러
 * 로그인 또는 회원가입 성공 시 반환 DTO
 */
public record AuthResult(
	String accessToken,
	AuthCheckResponse user
) implements KakaoLoginResult { // KakaoLoginResult 구현
}
