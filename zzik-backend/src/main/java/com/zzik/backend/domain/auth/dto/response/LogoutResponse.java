package com.zzik.backend.domain.auth.dto.response;

/**
 * 컨트롤러 -> 클라이언트
 * 로그아웃 응답 DTO
 */
public record LogoutResponse(
	Boolean loggedIn,
	String message
) {}
