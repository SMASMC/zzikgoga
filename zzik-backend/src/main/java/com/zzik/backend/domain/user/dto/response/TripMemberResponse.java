package com.zzik.backend.domain.user.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;

@Schema(description = "여행 참여 멤버 정보 응답 DTO")
public record TripMemberResponse(
	@Schema(description = "멤버 고유 ID", example = "3")
	Long memberId,

	@Schema(description = "멤버 이름", example = "홍길동")
	String memberName,

	@Schema(description = "멤버 프로필 썸네일 URL", example = "https://...")
	String thumbnailUrl,

	@Schema(description = "여행 합류 시각", example = "2025-01-20T15:30:00")
	LocalDateTime joinedAt
) {
}
