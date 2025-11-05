package com.zzik.backend.domain.cost.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.zzik.backend.domain.cost.dto.request.CostApprovalRequest;
import com.zzik.backend.domain.cost.dto.response.CostApprovalResponse;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.presentation.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Cost")
public interface CostApprovalApi {

	@Operation(
		summary = "정산 수락",
		description = "현재 로그인한 유저가 해당 여행에 대해서 본인 정산을 수락합니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "본인 정산 수락 완료",
			responseClass = CostApprovalResponse.class
		),
		errors = {

		}
	)
	@PostMapping("/{tripId}/accept")
	ResponseEntity<ApiResponse<CostApprovalResponse>> costApprove(
		@PathVariable Long tripId,
		@RequestBody CostApprovalRequest request
	);
}
