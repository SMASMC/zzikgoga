package com.zzik.backend.domain.cost.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.zzik.backend.domain.cost.dto.request.CostApprovalRequest;
import com.zzik.backend.domain.cost.dto.response.CostApprovalResponse;
import com.zzik.backend.domain.cost.dto.response.CostApprovalStatusResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
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
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.TRIP_NOT_FOUND),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.ALREADY_ACCEPTED_COST)
		}
	)
	@PostMapping("/{tripId}/accept")
	ResponseEntity<ApiResponse<CostApprovalResponse>> costApprove(
		@PathVariable Long tripId,
		@RequestBody CostApprovalRequest request
	);

	@Operation(
		summary = "정산 수락 현황 조회",
		description = "해당 여행에 모든 멤버의 정산 수락 현황을 조회합니다"
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "정산 수락 현황 조회 완료",
			responseClass = CostApprovalStatusResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.INVALID_ACCESS_TOKEN),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_TRIP_MEMBER),
		}
	)
	ResponseEntity<ApiResponse<CostApprovalStatusResponse>> getCostApproveStatus(
		@PathVariable Long tripId
	);
}
