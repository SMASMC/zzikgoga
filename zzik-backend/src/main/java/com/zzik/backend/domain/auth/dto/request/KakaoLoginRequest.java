package com.zzik.backend.domain.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

public record KakaoLoginRequest(
	@Schema(description = "카카오 idToken", example = "aaaaa")
	@NotBlank(message = "카카오 idToken이 필요합니다")
	String idToken
) { }
