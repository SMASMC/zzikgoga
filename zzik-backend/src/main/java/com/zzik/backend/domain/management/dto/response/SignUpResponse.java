package com.zzik.backend.domain.management.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "회원가입 응답 DTO")
public record SignUpResponse(
	@Schema(description = "인증된 사용자의 고유 ID", example = "1")
	Long memberId,

	@Schema(description = "회원 유형", example = "TEMP_HOST")
	String memberType
) {
}
