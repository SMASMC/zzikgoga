package com.zzik.backend.domain.cost.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "CostDeleteResponse")
public record CostDeleteResponse(
	@Schema(description = "삭제된 COST_ID")
	Long id
) {
}
