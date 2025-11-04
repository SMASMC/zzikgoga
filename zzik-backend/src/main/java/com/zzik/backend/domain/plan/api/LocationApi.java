package com.zzik.backend.domain.plan.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.zzik.backend.domain.plan.dto.LocationSearchSortType;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;

@Tag(name = "Plan")
public interface LocationApi {
	@Operation(summary = "장소 검색")
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "장소 검색 성공",
			responseClass = LocationSearchResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.LOCATION_API_ERROR),
		}
	)
	@GetMapping
	ResponseEntity<ApiResponse<LocationSearchResponse>> getLocationList(
		@RequestParam(name = "q") @NotBlank(message = "검색어를 입력해주세요.")
		@Schema(description = "장소 검색어", example = "성심당")
		String query,

		@RequestParam(required = false, defaultValue = "10")
		@Schema(description = "반환 결과 수", example = "10")
		int limit,

		@RequestParam(required = false, defaultValue = LocationSearchSortType.DEFAULT_VALUE)
		@Schema(description = "반환 정렬 타입", example = LocationSearchSortType.DEFAULT_VALUE)
		LocationSearchSortType sort,

		@RequestParam(required = false, defaultValue = "37.554722")
		@Schema(description = "거리계산 기준 위도", example = "37.554722")
		double lat,

		@RequestParam(required = false, defaultValue = "126.970833")
		@Schema(description = "거리계산 기준 경도", example = "126.970833")
		double lng
	);
}
