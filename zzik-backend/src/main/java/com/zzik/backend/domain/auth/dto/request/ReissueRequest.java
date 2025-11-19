package com.zzik.backend.domain.auth.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ReissueRequest(
	@NotBlank(message = "refreshToken must not be blank")
	String refreshToken) {
}
