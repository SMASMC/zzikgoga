package com.zzik.backend.domain.user.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "여행 멤버 목록 조회 응답 DTO")
public record TripMemberListResponse(
	@Schema(description = "여행 고유 ID", example = "13")
	Long tripId,

	@Schema(description = "참여 멤버 목록")
	List<TripMemberResponse> members
) {
}
