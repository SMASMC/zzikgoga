package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "정산 수락 현황")
public record CostApprovalStatusResponse(
	@Schema(description = "여행 ID") Long tripId,
	@Schema(description = "정산을 수락한 멤버 목록") List<AcceptedMemberDto> acceptedMembers,
	@Schema(description = "정산을 아직 수락하지 않은 멤버 목록") List<NotAcceptedMemberDto> notAcceptedMembers,
	@Schema(description = "수락한 멤버 수") Integer acceptedCount,
	@Schema(description = "전체 멤버 수") Integer totalMemberCount,
	@Schema(description = "수락률 (0.0 ~ 100.0)") Double acceptanceRate
) {
	@Schema(description = "정산을 수락한 멤버 정보")
	public static record AcceptedMemberDto(
		@Schema(description = "멤버 ID") Long memberId,
		@Schema(description = "멤버 이름") String memberName,
		@Schema(description = "프로필 이미지 URL") String thumbnailUrl,
		@Schema(description = "수락 일시") String acceptedAt
	) {
	}

	@Schema(description = "정산을 아직 수락하지 않은 멤버 정보")
	public static record NotAcceptedMemberDto(
		@Schema(description = "멤버 ID") Long memberId,
		@Schema(description = "멤버 이름") String memberName,
		@Schema(description = "프로필 이미지 URL") String thumbnailUrl
	) {
	}
}
