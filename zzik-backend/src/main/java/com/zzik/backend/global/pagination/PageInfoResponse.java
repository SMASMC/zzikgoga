package com.zzik.backend.global.pagination;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "페이지네이션 정보 DTO")
public record PageInfoResponse(
	@Schema(description = "다음 페이지 조회를 위한 커서 ID (null이면 마지막 페이지)", example = "9")
	Long nextCursor
) {
}
