package com.zzik.backend.domain.media.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

import com.zzik.backend.global.pagination.PageInfoResponse;

@Schema(description = "사진 목록 조회 응답 DTO")
public record PhotoListResponse(
	@Schema(description = "여행 ID", example = "123")
	Long tripId,

	@Schema(description = "사진 목록")
	List<PhotoDetailResponse> photos,

	@Schema(description = "페이지네이션 정보")
	PageInfoResponse pageInfo
) {
}
