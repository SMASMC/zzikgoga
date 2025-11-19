package com.zzik.backend.domain.cost.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "비용 승인 요청 DTO", example = "{ \"accept\": true }")
public record CostApprovalRequest(
	@Schema(description = "승인 여부", example = "true", required = true)
	Boolean accept
) {
}
