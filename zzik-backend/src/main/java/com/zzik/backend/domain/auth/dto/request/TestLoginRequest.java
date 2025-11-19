package com.zzik.backend.domain.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

public record TestLoginRequest(
	@Schema(example = "a@test.com")
	String email
) {
}
