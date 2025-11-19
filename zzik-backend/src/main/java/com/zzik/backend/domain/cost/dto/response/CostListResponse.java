package com.zzik.backend.domain.cost.dto.response;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "정산 목록 조회 응답")
public record CostListResponse(
	@Schema(description = "정산 목록") List<CostSummary> costs,
	@Schema(description = "정산 개수") Integer totalCostCount,
	@Schema(description = "총 정산 금액") Long totalCost
) {
	@Builder
	@Schema(description = "정산 요약 정보")
	public static record CostSummary(
		@Schema(description = "정산 ID") Long costId,
		@Schema(description = "결제 일시") String paidAt,
		@Schema(description = "결제 장소") String place,
		@Schema(description = "결제자 이름") String payerName,
		@Schema(description = "결제자 썸네일URL") String payerThumbnailUrl,
		@Schema(description = "결제자 ID") Long payerId,
		@Schema(description = "총 금액") Long totalAmount
	) {
	}
}
