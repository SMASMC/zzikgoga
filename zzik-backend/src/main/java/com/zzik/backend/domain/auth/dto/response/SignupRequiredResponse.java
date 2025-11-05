package com.zzik.backend.domain.auth.dto.response;

/**
 * 컨트롤러 -> 클라이언트
 * 회원가입 필요 시 응답 DTO
 */
public record SignupRequiredResponse(
	Boolean loggedIn,
	Boolean signupRequired,
	String signupSessionToken,
	String name,
	String email,
	String picture
) implements LoginResponse { // LoginResponse 구현
}
