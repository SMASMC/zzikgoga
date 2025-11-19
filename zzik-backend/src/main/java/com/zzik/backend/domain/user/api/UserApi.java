package com.zzik.backend.domain.user.api;

import com.zzik.backend.domain.user.dto.response.TripMemberListResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode; // (존재한다고 가정)
import com.zzik.backend.global.presentation.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;

@Tag(name = "User - Trip Management", description = "사용자 여행 관련 API")
public interface UserApi {

	@Operation(
		summary = "여행 멤버 목록 조회",
		description = "특정 여행(tripId)에 속한 모든 멤버의 목록을 조회합니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "여행 멤버 목록 조회 성공",
			responseClass = TripMemberListResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_FOUND_RESOURCE)
		}
	)
	ResponseEntity<ApiResponse<TripMemberListResponse>> getTripMembers(
		@Parameter(description = "여행의 고유 ID", example = "13")
		@PathVariable Long tripId
	);
}
