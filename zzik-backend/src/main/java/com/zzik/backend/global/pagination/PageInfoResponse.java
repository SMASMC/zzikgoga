package com.zzik.backend.global.pagination;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "커서 기반 페이지네이션 정보 DTO")
public record PageInfoResponse(
	@Schema(description = "다음 페이지를 위한 커서 (null이면 마지막 페이지)", example = "42")
	Long nextCursor
) {
}
