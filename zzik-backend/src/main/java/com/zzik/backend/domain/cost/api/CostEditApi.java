package com.zzik.backend.domain.cost.api;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

import com.zzik.backend.domain.cost.dto.request.CostEditRequest;
import com.zzik.backend.domain.cost.dto.response.CostEditResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Cost")
public interface CostEditApi {

	@Operation(
		summary = "정산 항목 수정",
		description = "락 보유자가 정산 항목을 수정합니다. (메뉴 추가/수정/삭제 포함)"
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "정산 수정 성공",
			responseClass = CostEditResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.TRIP_NOT_FOUND),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_TRIP_MEMBER),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.COST_MENU_NOT_FOUND),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.EDIT_LOCK_HELD_BY_OTHERS),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.TRIP_COST_ALREADY_COMPLETED)
		}
	)
	@PutMapping(
		value = "/{tripId}/{costId}",
		consumes = MediaType.APPLICATION_JSON_VALUE,
		produces = MediaType.APPLICATION_JSON_VALUE
	)
	ResponseEntity<ApiResponse<CostEditResponse>> editCost(
		@PathVariable Long tripId,
		@PathVariable Long costId,
		@RequestBody CostEditRequest request
	);
}
