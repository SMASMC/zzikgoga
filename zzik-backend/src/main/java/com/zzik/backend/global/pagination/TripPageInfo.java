package com.zzik.backend.global.pagination;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "여행 목록 페이지네이션 정보 DTO")
public record TripPageInfo(
	@Schema(description = "현재 페이지 번호 (1부터 시작)", example = "1")
	int currentPage,

	@Schema(description = "전체 페이지 수", example = "5")
	int totalPages,

	@Schema(description = "전체 항목 수", example = "35")
	long totalCount
) {
}
