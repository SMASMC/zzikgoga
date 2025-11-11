package com.zzik.backend.domain.memory.api;

import com.zzik.backend.domain.memory.dto.request.MemorySaveRequest;
import com.zzik.backend.domain.memory.dto.response.MemoryDetailResponse;
import com.zzik.backend.global.annotation.swagger.ApiErrorResponseExplanation;
import com.zzik.backend.global.annotation.swagger.ApiResponseExplanations;
import com.zzik.backend.global.annotation.swagger.ApiSuccessResponseExplanation;
import com.zzik.backend.global.exception.ExceptionCode;
import com.zzik.backend.global.presentation.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@Tag(name = "Memory", description = "여행 기록(추억) API")
public interface MemoryApi {

	@Operation(
		summary = "여행 기록 저장 (생성/수정)",
		description = "특정 여행(tripId)에 대한 나의 여행 기록을 저장(Upsert)합니다.\n" +
			"기록이 없으면 새로 생성하고, 있으면 덮어씁니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "기록 저장 성공",
			responseClass = MemoryDetailResponse.class // 상세 DTO 반환
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_FOUND_RESOURCE),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.FORBIDDEN)
		}
	)
	ResponseEntity<ApiResponse<MemoryDetailResponse>> saveMemory(
		@PathVariable Long tripId,
		@RequestBody @Valid MemorySaveRequest request
	);

	@Operation(
		summary = "나의 여행 기록 상세 조회",
		description = "특정 여행(tripId)에 속한 **나의** 여행 기록 상세 내용을 조회합니다."
	)
	@ApiResponseExplanations(
		success = @ApiSuccessResponseExplanation(
			description = "기록 상세 조회 성공",
			responseClass = MemoryDetailResponse.class
		),
		errors = {
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.NOT_FOUND_RESOURCE),
			@ApiErrorResponseExplanation(exceptionCode = ExceptionCode.FORBIDDEN)
		}
	)
	ResponseEntity<ApiResponse<MemoryDetailResponse>> getMyMemory(
		@PathVariable Long tripId
	);
}
