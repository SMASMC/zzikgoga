package com.zzik.backend.domain.auth.dto.response;

import lombok.Builder;

@Builder
public record TestLoginResponse(
	String accessToken,
	Long memberId,
	String email,
	String name
) {
}
