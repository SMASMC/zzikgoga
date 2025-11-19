package com.zzik.backend.domain.auth.dto.response;

/**
 * 컨트롤러 -> 클라이언트
 * 단순 메시지 응답 DTO (토큰 재발급 등)
 */
public record MessageResponse(
	String message
) {}
