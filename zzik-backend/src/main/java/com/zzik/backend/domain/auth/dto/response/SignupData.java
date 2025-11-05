package com.zzik.backend.domain.auth.dto.response;

/**
 * 서비스 계층 -> 컨트롤러
 * 카카오 로그인 시도 시 회원가입이 필요할 때 반환 DTO
 */
public record SignupData(
	String signupSessionToken,
	String name,
	String email,
	String picture
) implements KakaoLoginResult { // KakaoLoginResult 구현
}
