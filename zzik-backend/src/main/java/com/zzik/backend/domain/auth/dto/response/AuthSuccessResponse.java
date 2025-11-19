package com.zzik.backend.domain.auth.dto.response;

/**
 * 컨트롤러 -> 클라이언트
 * 최종 로그인 성공 또는 인증 상태 확인 응답 DTO
 */
public record AuthSuccessResponse(
	Boolean loggedIn,
	AuthCheckResponse user
) implements LoginResponse { // LoginResponse 구현
}
